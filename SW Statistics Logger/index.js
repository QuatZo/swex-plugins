const request = require('request');
const versionChecker = require('sw-exporter-plugin-version-checker');

module.exports = {
  defaultConfig: {
    enabled: true,
  },
  defaultConfigDetails: {
  },

  pluginName: 'SWStatisticsLogger',
  pluginDescription: 'Sends profile & any runs data to SW Statistics.',
  swstatsHref: 'http://swstats.info/api',

  init(proxy, config) {
    versionChecker.proceed({
      name: this.pluginName,
      config: require('./package.json'),
      proxy: proxy,
    });
    var options = {
      method: 'get',
      uri: this.swstatsHref + '/command/',
    };

    this.swstatsCommands = [];
    this.requestCommands = [];
    this.responseCommands = [];
    this.bothCommands = [];

    request(options, (error, response) => {
      if (error) {
        proxy.log({ type: 'error', source: 'plugin', name: this.pluginName, message: `Error: Couldn't retrieve commands from SWStatistics.` });
        return;
      }
      if (response.statusCode === 200) {
        this.swstatsResponse = JSON.parse(response.body);
        var commands = [];
        var requestCommands = [];
        var responseCommands = [];
        var bothCommands = [];

        this.swstatsResponse.map(function(obj) {
          commands.push(obj.name);
          switch(obj.message_type){
            case 1: requestCommands.push(obj.name);
                    break;
            case 2: responseCommands.push(obj.name);
                    break;
            case 3: bothCommands.push(obj.name);
                    break;
          }
        })
        this.swstatsCommands = commands;
        this.requestCommands = requestCommands;
        this.responseCommands = responseCommands;
        this.bothCommands = bothCommands;

        proxy.log({ type: 'success', source: 'plugin', name: this.pluginName, message: `Successfuly rertieved commands from SWStatistics. Available commands: ${this.swstatsCommands.join(', ')}` });
      } else {
        proxy.log({
          type: 'error',
          source: 'plugin',
          name: this.pluginName,
          message: `Request failed: Server responded with code: ${response.statusCode}`
        });
      }
    });
    
    proxy.on('apiCommand', (req, resp) => {
      try {
        if (config.Config.Plugins[this.pluginName].enabled) {
          const { command } = req;
          
          if (this.responseCommands.includes(command)) {
            this.send_response_data(proxy, req, resp);
          }
          else if (this.bothCommands.includes(command)){
            this.send_live(proxy, req, resp);
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

  send_live(proxy, req, resp){
    const { command } = req;
    var data = {
      "command": command,
      "request": req,
      "response": resp
    };


    var options = {
      method: 'post',
      uri:  this.swstatsHref + '/upload/',
      json: true,
      body: data
    };

    request(options, (error, response) => {
      if (error) {
        proxy.log({ type: 'error', source: 'plugin', name: this.pluginName, message: `Error: ${error.message}` });
        return;
      }
      if (response.statusCode === 201) {
        proxy.log({ type: 'success', source: 'plugin', name: this.pluginName, message: `${command} logged successfully. Thanks for contributing!` });
      } else if (response.statusCode !== 200) {
        proxy.log({
          type: 'error',
          source: 'plugin',
          name: this.pluginName,
          message: `Request failed: Server responded with code: ${response.statusCode}`
        });
      }
    });

  },

  send_response_data(proxy, req, resp){
    const { command } = req;

    var options = {
      method: 'post',
      uri: this.swstatsHref + '/upload/',
      json: true,
      body: resp
    };

    request(options, (error, response) => {
      if (error) {
        proxy.log({ type: 'error', source: 'plugin', name: this.pluginName, message: `Error: ${error.message}` });
        return;
      }
      if (response.statusCode === 201) {
        proxy.log({ type: 'success', source: 'plugin', name: this.pluginName, message: `${command} logged successfully. Thanks for contributing!` });
      } 
      else if (response.statusCode !== 200) {
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