import fetch from "node-fetch";

const apiToken = process.env.SIMI_API_TOKEN;
if (!apiToken) {
  throw new Error("SIMI_API_TOKEN is not defined in the environment variables");
}

// Token encoding and base64 encoding
const encodingToken = Buffer.from(`:${apiToken}`);
const base64Token = encodingToken.toString("base64");

// Fetch options
const fetchOptions = {
  method: "GET",
  headers: {
    Authorization: `Basic ${base64Token}`,
    Accept: "application/json",
  },
};

export const $useSimiApi = async (fullUrl) => {
  try {
    console.log(`Fetching data from: ${fullUrl}`);
    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Simi API data:", error.message);
    throw error;
  }
};
