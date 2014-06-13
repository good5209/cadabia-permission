Package.describe({
  summary: "Cadabia permission framework"
});

Package.on_use(function (api, where) {
  api.export('Cadabia');
  api.add_files('cadabia-permission.js', ['server']);
  api.add_files('permission.js', ['server']);
});

Package.on_test(function (api) {
  api.use(['cadabia-permission', 'tinytest', 'test-helpers', 'accounts-base', 'accounts-password'], ['client', 'server']);
  api.add_files('cadabia-permission_tests.js', ['server']);
  api.add_files('permission_tests.js', ['server']);
});
