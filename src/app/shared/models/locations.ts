export interface LocationResult {
  data: Location[];
  meta: any;
}

export interface Location {
  type: string;
  subType: string;
  name: string;
  iataCode?: string;
  address?: {
    cityName?: string;
    cityCode?: string;
    countryName?: string;
    countryCode?: string;
  };
}

export interface CityDto {
  name: string;
  iataCode: string;
  country: string;
  zone?: string
}
