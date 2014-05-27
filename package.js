Package.describe({
  summary: "Cadabia permission framework"
});

Package.on_use(function (api, where) {
  api.export('Cadabia');
  api.add_files('cadabia-permission.js', ['client', 'server']);
  api.add_files('permission.js', ['client', 'server']);
});

Package.on_test(function (api) {
  api.use(['cadabia-permission', 'tinytest', 'test-helpers'], ['client', 'server']);
  api.add_files('cadabia-permission_tests.js', ['client', 'server']);
});
