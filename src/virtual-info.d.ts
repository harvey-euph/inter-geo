declare module 'virtual:object-index' {
  const catalog: import('./objects/types').ObjectCatalog;
  export default catalog;
}

declare module 'virtual:info-index' {
  const stubs: import('./types/info').InfoStub[];
  export default stubs;
}

declare module 'virtual:csv-filter-index' {
  const stubs: import('./filters/csvFilterParser').CsvFilterStub[];
  export default stubs;
}
