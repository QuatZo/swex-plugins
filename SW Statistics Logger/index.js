const request = require('request');

module.exports = {
  defaultConfig: {
    enabled: true,
  },
  defaultConfigDetails: {
  },

  pluginName: 'SWStatisticsLogger',
  pluginDescription: 'Sends profile & any runs data to SW Statistics.',

  init(proxy, config) {
    proxy.on('apiCommand', (req, resp) => {
      try {
        if (config.Config.Plugins[this.pluginName].enabled) {
          const { command } = req;


          if (command === 'HubUserLogin') {
            this.send_profile(proxy, req, resp);
          }
        }
      } catch (e) {
        proxy.log({
          type: 'error',
          source: 'plugin',
          name: this.pluginName,
          message: `An unexpected error occurred: ${e.message}`
        });
      }
    });
  },

  send_profile(proxy, req, resp){
    const { command } = req;

    var options = {
      method: 'post',
      uri: 'http://localhost:8000/api/upload/',
      json: true,
      body: resp
    };

    request(options, (error, response) => {
      if (error) {
        proxy.log({ type: 'error', source: 'plugin', name: this.pluginName, message: `Error: ${error.message}` });
        return;
      }
      if (response.statusCode === 201) {
        proxy.log({ type: 'success', source: 'plugin', name: this.pluginName, message: `${command} logged successfully your profile. Thanks for contributing!` });
      } else {
        proxy.log({
          type: 'error',
          source: 'plugin',
          name: this.pluginName,
          message: `Request failed: Server responded with code: ${response.statusCode}`
        });
      }
    });
  },
};