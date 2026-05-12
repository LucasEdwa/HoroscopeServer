/**
 * Timezone validation and enforcement utilities
 * Ensures geocoded timezone data is always used for accurate chart calculations
 */

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffset: number;
  formatted?: string; // Geocoding service's formatted result (e.g., "Brazil" vs "Natal, Rio Grande do Norte, Brazil")
}

export interface ValidatedTimezoneData {
  timezoneOffset: number;
  timezone: string;
  source: 'geocoding' | 'calculated';
  confidence: 'high' | 'low' | 'fallback';
}

/**
 * Validate that geocoding returned proper timezone data
 * @param geoData Geocoded location data from OpenCage
 * @param requestedCity The city name that was requested
 * @returns Validated timezone data with confidence level
 */
export function validateGeocodedTimezone(geoData: GeocodedLocation, requestedCity?: string): ValidatedTimezoneData {
  // Timezone offset should be a number (can be negative)
  if (typeof geoData.timezoneOffset !== 'number' || isNaN(geoData.timezoneOffset)) {
    console.warn(`[TimezoneValidation] Invalid timezone offset: ${geoData.timezoneOffset}`);
    return {
      timezoneOffset: calculateTimezoneFromLongitude(geoData.longitude),
      timezone: 'UNKNOWN',
      source: 'calculated',
      confidence: 'low'
    };
  }

  // Timezone name should be a valid IANA identifier (e.g., "America/New_York", "Europe/London")
  if (!geoData.timezone || typeof geoData.timezone !== 'string') {
    console.warn(`[TimezoneValidation] Missing or invalid timezone name`);
    return {
      timezoneOffset: geoData.timezoneOffset,
      timezone: 'UNKNOWN',
      source: 'geocoding',
      confidence: 'low'
    };
  }

  // Cross-check: verify offset is reasonable for the longitude
  const calculatedOffset = calculateTimezoneFromLongitude(geoData.longitude);
  const offsetDifference = Math.abs(geoData.timezoneOffset - calculatedOffset);
  
  // If offset differs by more than 3.5 hours from calculated, flag it
  // (Accounts for DST, half-hour zones, and timezone boundaries)
  let confidence: 'high' | 'low' | 'fallback' = offsetDifference <= 3.5 ? 'high' : 'low';

  if (confidence === 'low') {
    console.warn(
      `[TimezoneValidation] Timezone offset mismatch: geocoded=${geoData.timezoneOffset}h, ` +
      `calculated from longitude=${calculatedOffset}h, difference=${offsetDifference}h. ` +
      `Using geocoded value but confidence is LOW. Verify location is correct.`
    );
  }

  // Extra validation: Check if geocoding returned a vague result (country-level instead of city-level)
  // This helps catch cases where the city name was misinterpreted
  if (requestedCity && geoData.formatted) {
    // Check if result is just a country name or very vague
    const vagueLowercase = geoData.formatted.toLowerCase();
    const requestLowercase = requestedCity.toLowerCase();
    
    // Count commas: "City, State, Country" = 2 commas (good), "Country" = 0 commas (bad)
    const commaCount = geoData.formatted.split(',').length - 1;
    const isVague = commaCount <= 1; // Less than 2 commas = vague
    
    if (isVague && !requestLowercase.includes(vagueLowercase.split(',')[0])) {
      console.warn(
        `[TimezoneValidation] SUSPICION: Geocoding returned a vague result (${geoData.formatted}). ` +
        `Expected something more specific for "${requestedCity}". ` +
        `Result has only ${commaCount} location levels (should have City, State, Country = 2+ commas).`
      );
      confidence = 'low';
    }
  }

  if (confidence === 'high') {
    console.log(
      `[TimezoneValidation] Timezone validated: ${geoData.timezone} (offset=${geoData.timezoneOffset}h) ✓`
    );
  }

  return {
    timezoneOffset: geoData.timezoneOffset,
    timezone: geoData.timezone,
    source: 'geocoding',
    confidence
  };
}

/**
 * Fallback: calculate timezone offset from longitude
 * This is approximate and should only be used if geocoding fails
 * @param longitude Geographic longitude
 * @returns Approximate timezone offset in hours
 */
export function calculateTimezoneFromLongitude(longitude: number): number {
  return Math.round(longitude / 15);
}

/**
 * Enforce that geocoded timezone is used for chart calculation
 * Logs warnings if timezone data quality is questionable
 * @param timezone Validated timezone data
 * @returns Timezone offset guaranteed to be from geocoding (or a warning if fallback was used)
 */
export function enforceGeocodedTimezone(timezone: ValidatedTimezoneData): number {
  if (timezone.source === 'calculated') {
    console.warn(
      `[TimezoneEnforcement] WARNING: Using calculated timezone offset (${timezone.timezoneOffset}h) ` +
      `because geocoding did not provide valid data. Chart accuracy may be compromised.`
    );
  }

  if (timezone.confidence === 'low') {
    console.warn(
      `[TimezoneEnforcement] WARNING: Timezone confidence is LOW. ` +
      `The geocoded location may be incorrect. Verify: ${timezone.timezone} (${timezone.timezoneOffset}h)`
    );
  }

  return timezone.timezoneOffset;
}

/**
 * Log detailed timezone information for debugging
 * @param geoData Geocoded location data
 * @param validated Validated timezone data
 */
export function logTimezoneDebugInfo(geoData: GeocodedLocation, validated: ValidatedTimezoneData): void {
  console.log(`
[TimezoneDebug]
  Location: lat=${geoData.latitude}, lng=${geoData.longitude}
  Geocoded Timezone: ${geoData.timezone} (offset=${geoData.timezoneOffset}h)
  Validated Source: ${validated.source}
  Confidence: ${validated.confidence}
  Using Offset: ${validated.timezoneOffset}h
`);
}
