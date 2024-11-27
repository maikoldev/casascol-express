import { Router } from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

  const apiUrl = `http://simi-api.com/ApiSimiweb/response/v2.1.1/filtroInmueble/limite/${newParams.limite}/total/${newParams.cantidad}`;
  const response = await fetch(apiUrl, fetchOptions);
  const data = await response.json();

  // console.log("res", response);
  // console.log("data", data);

  const properties = data.Inmuebles;
  const datosGrales = data.datosGrales;

  console.log("datosGrales", datosGrales);

  if (parseInt(datosGrales.pagina_actual) < parseInt(datosGrales.fin)) {
    // console.log("entre");
    newParams.limite += 1;
    const nextProperties = await fetchAllProperties(newParams);

    if (nextProperties.length > 0) {
      properties.push(...nextProperties);
    }
  }

  return properties;
};

const getPropertiesCodes = async (properties) => {
  const propertiesCodes = properties.map((property) => property.Codigo_Inmueble);

  saveCodesFile(propertiesCodes);

  return propertiesCodes;
};

const fetchSingleProperty = async (propertyCode) => {
  try {
    console.log("Fetching property with code:", propertyCode);

    const apiUrl = `http://simi-api.com/ApiSimiweb/response/v2/inmueble/codInmueble/${propertyCode}`;
    const response = await fetch(apiUrl, fetchOptions);

    console.log("response", response);
    // const data = await response.json();

    // return data;
  } catch (error) {
    console.error(`Error fetching property ${propertyCode}:`, error.message);
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

  const allProperties = await fetchAllProperties(newParams);
  const propertiesCodes = await getPropertiesCodes(allProperties);

  res.json({
    // data: allProperties,
    // single: singleProperties || [],
    codes: propertiesCodes,
    count: allProperties.length,
  });
});

mainRouter.get("/import/secondary", async (req, res) => {
  const currentDate = new Date().toISOString().split("T")[0];
  const fileName = `property_codes_${currentDate}.txt`;
  const filePath = path.join(__dirname, fileName);

  const codes = fs.readFileSync(filePath, "utf8");
  const codesArray = codes.split("\n");

  // console.log("codesArray", codesArray);
  // return;

  const singlePropertiesPromises = codesArray.map((code) => fetchSingleProperty(code));
  // console.log("singlePropertiesPromises", singlePropertiesPromises);
  return "x";

  // const singleProperties = await Promise.all(singlePropertiesPromises);

  // console.log("allProperties", allProperties);

  res.json({
    singles: singleProperties,
    count: singleProperties.length,
  });
});

export default mainRouter;
