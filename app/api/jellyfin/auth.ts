export function jellyfinAuthHeader(apiKey:string){
  return {
    Authorization:`MediaBrowser Client="Streamivio", Device="Streamivio Web", DeviceId="streamivio-web", Version="1.0.0", Token="${apiKey}"`
  };
}
