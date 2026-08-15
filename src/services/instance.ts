import axios from 'axios';


const baseUrl = import.meta.env.VITE_API_BASE_URL;

const apiInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
    "Allow-Control-Allow-Origin": "*",
  },
});


export default apiInstance;
