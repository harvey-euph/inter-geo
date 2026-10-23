declare module 'virtual:lore-index' {
  const stubs: import('./types/lore').LoreStub[];
  export default stubs;
}

declare module 'virtual:csv-filter-index' {
  const stubs: import('./filters/csvFilterParser').CsvFilterStub[];
  export default stubs;
}
