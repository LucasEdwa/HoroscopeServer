import axios from 'axios';

export async function geocodeLocation(city: string, country: string): Promise<{ latitude: number; longitude: number; timezone: string; timezoneOffset: number }> {
  try {
    const apiKey = process.env.GEOCODING_API_KEY; // Ensure this is set in your .env file
    if (!apiKey) {
      throw new Error('Geocoding API key is missing. Please set GEOCODING_API_KEY in your .env file.');
    }


    const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        q: `${city}, ${country}`,
        key: apiKey
      }
    });


    if (response.data.results.length === 0) {
      console.error('No geocoding results found for:', { city, country });
      throw new Error('No geocoding results found');
    }

    const result = response.data.results[0];
    const { lat, lng } = result.geometry;
    
    // Extract timezone information from the response
    const timezone = result.annotations?.timezone?.name || 'UTC';
    const timezoneOffset = result.annotations?.timezone?.offset_sec ? 
      result.annotations.timezone.offset_sec / 3600 : 0; // Convert seconds to hours
    
  
    return { 
      latitude: lat, 
      longitude: lng, 
      timezone, 
      timezoneOffset 
    };
  } catch (error: any) {
    const status = error.response?.status;
    const body = error.response?.data;
    console.error('Error geocoding location:', { status, body, message: error.message });
    if (status === 401 || status === 403) {
      throw new Error('Geocoding failed: invalid or unauthorized API key. Restart the server after updating GEOCODING_API_KEY, or verify the key at opencagedata.com/dashboard.');
    }
    if (status === 402 || status === 429) {
      throw new Error('Geocoding failed: API quota exceeded.');
    }
    throw new Error(`Failed to geocode location${error.message ? `: ${error.message}` : ''}`);
  }
}
