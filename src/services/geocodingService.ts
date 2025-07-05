import axios from 'axios';

export async function geocodeLocation(city: string, country: string): Promise<{ latitude: number; longitude: number }> {
  try {
    const apiKey = process.env.GEOCODING_API_KEY; // Ensure this is set in your .env file
    if (!apiKey) {
      throw new Error('Geocoding API key is missing. Please set GEOCODING_API_KEY in your .env file.');
    }

    console.log('Geocoding request:', { city, country, apiKey }); // Log the request details

    const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        q: `${city}, ${country}`,
        key: apiKey
      }
    });

    console.log('Geocoding response:', response.data); // Log the response data

    if (response.data.results.length === 0) {
      console.error('No geocoding results found for:', { city, country });
      throw new Error('No geocoding results found');
    }

    const { lat, lng } = response.data.results[0].geometry;
    return { latitude: lat, longitude: lng };
  } catch (error: any) {
    console.error('Error geocoding location:', error.message || error);
    throw new Error('Failed to geocode location');
  }
}
