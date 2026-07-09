const cds = require('@sap/cds');

describe('CatalogService smoke', () => {
  const test = cds.test(__dirname + '/..');

  it('boots and serves Books with seed data', async () => {
    const { status, data } = await test.get('/odata/v4/catalog/Books');
    expect(status).toBe(200);
    expect(data.value.length).toBeGreaterThan(0);
  });

  it('exposes ListOfBooks read-only', async () => {
    const { status } = await test.get('/odata/v4/catalog/ListOfBooks?$top=1');
    expect(status).toBe(200);
  });
});
