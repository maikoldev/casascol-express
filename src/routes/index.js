import { Router } from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pLimit from "p-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainRouter = Router();
const apiToken = process.env.SIMI_API_TOKEN;
const encodingToken = Buffer.from(`:${apiToken}`);
const base64Token = encodingToken.toString("base64");

const fetchOptions = {
  method: "GET",
  headers: {
    Authorization: `Basic ${base64Token}`,
    Accept: "application/json",
  },
};

const fetchAllProperties = async (params) => {
  const newParams = {
    limite: params?.limite || 1,
    cantidad: params?.cantidad || 100,
  };

  const allProperties = [];
  let hasMorePages = true;

  while (hasMorePages) {
    const apiUrl = `http://simi-api.com/ApiSimiweb/response/v2.1.1/filtroInmueble/limite/${newParams.limite}/total/${newParams.cantidad}`;
    const response = await fetch(apiUrl, fetchOptions);
    const data = await response.json();

    const properties = data.Inmuebles;
    const datosGrales = data.datosGrales;

    allProperties.push(...properties);

    if (parseInt(datosGrales.pagina_actual) < parseInt(datosGrales.fin)) {
      newParams.limite += 1;
    } else {
      hasMorePages = false;
    }
  }

  return allProperties;
};

const getPropertiesCodes = async (properties) => {
  const propertiesCodes = properties.map((property) => property.Codigo_Inmueble);

  saveCodesFile(propertiesCodes);

  return propertiesCodes;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSingleProperty = async (propertyCode, retries = 3, delayMs = 1000) => {
  const startTime = Date.now();
  console.log(`[${startTime}] Start fetching property with code: ${propertyCode}`);

  try {
    const apiUrl = `http://simi-api.com/ApiSimiweb/response/v2/inmueble/codInmueble/${propertyCode}`;
    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    const endTime = Date.now();
    console.log(`[${endTime}] Finished fetching property with code: ${propertyCode}`);

    return data;
  } catch (error) {
    if (retries > 0) {
      console.error(`Error fetching property with code: ${propertyCode}. Retrying in ${delayMs}ms...`);
      await delay(delayMs);
      return fetchSingleProperty(propertyCode, retries - 1);
    }

    console.error(`Failed to fetch ${propertyCode} after retries`);
    return null;
  }
};

const saveCodesFile = (codes) => {
  const currentDate = new Date().toISOString().split("T")[0];
  const fileName = `property_codes_${currentDate}.txt`;
  const filePath = path.join(__dirname, fileName);

  fs.writeFileSync(filePath, codes.join("\n"), { encoding: "utf8" });
  console.log("File saved at", filePath);
};

mainRouter.post("/import/main", async (req, res) => {
  const { itemsPerPage = 100, page = 1 } = req.query;

  const newParams = {
    limite: parseInt(page),
    cantidad: parseInt(itemsPerPage),
  };

  try {
    const allProperties = await fetchAllProperties(newParams);
    const propertiesCodes = await getPropertiesCodes(allProperties);

    res.json({
      codes: propertiesCodes,
      count: allProperties.length,
    });
  } catch (error) {
    console.error("Error fetching properties:", error.message);
    res.status(500).json({ error: error.message });
  }
});

mainRouter.get("/import/secondary", async (req, res) => {
  const currentDate = new Date().toISOString().split("T")[0];
  const fileName = `property_codes_${currentDate}.txt`;
  const filePath = path.join(__dirname, fileName);

  const codes = fs.readFileSync(filePath, "utf8");
  const codesArray = codes.split("\n");

  // Set the concurrency limit
  const concurrencyLimit = 5;
  const limiter = pLimit(concurrencyLimit);

  const singlePropertiesPromises = codesArray.map((code) =>
    // prettier-ignore
    limiter(() => fetchSingleProperty(code))
  );

  try {
    const singleProperties = await Promise.all(singlePropertiesPromises);
    const countProperties = singleProperties.filter((prop) => prop !== null).length;

    console.log("All properties fetched");

    res.json({
      singles: singleProperties,
      count: countProperties,
    });
  } catch (error) {
    console.error("Error fetching properties:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default mainRouter;
