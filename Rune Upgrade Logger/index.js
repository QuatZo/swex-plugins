const fs = require('fs-extra');
const csv = require('fast-csv');
const path = require('path');
const dateFormat = require('dateformat');
const sanitize = require('sanitize-filename');

module.exports = {
  defaultConfig: {
    enabled: false,
  },
  defaultConfigDetails: {

  },

  pluginName: 'RuneUpgradeLogger',
  pluginDescription: 'Creates a local csv file and saves data of every rune upgrade.',
  init(proxy, config) {
    proxy.on('apiCommand', (req, resp) => {
      try {
        if (config.Config.Plugins[this.pluginName].enabled) {
          const { command } = req;


          if (command === 'UpgradeRune') {
            this.log_rune_upgrade(proxy, req, resp);
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

  rune_upgrade_cost: {
    1: [ 100, 175, 250, 400, 550, 775, 1000, 1300, 1600, 2000, 2400, 2925, 3450, 4100, 4750],
    2: [ 150, 300, 450, 700, 950, 1275, 1600, 2025, 2450, 3000, 3550, 4225, 4900, 5700, 6500],
    3: [ 225, 475, 725, 1075, 1425, 1875, 2325, 2850, 3375, 4075, 4775, 5600, 6425, 7375, 8325],
    4: [ 330, 680, 1030, 1480, 1930, 2455, 2980, 3680, 4380, 5205, 6030, 6980, 7930, 9130, 10330],
    5: [ 500, 950, 1400, 1925, 2450, 3175, 3900, 4750, 5600, 6600, 7600, 8850, 10100, 11600, 13100],
    6: [ 750, 1475, 2200, 3050, 3900, 4875, 5850, 6975, 8100, 9350, 10600, 11975, 13350, 14850, 16350],
  },

  log_rune_upgrade(proxy, req, resp){
    const { rune_id, slot_no, rank, class: rune_class, set_id, upgrade_curr } = resp.rune;
    const { wizard_id, wizard_name} = resp.wizard_info;
    var upgraded = upgrade_curr - req.upgrade_curr;
    var data = {
        id: rune_id,
        date: dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss'),
        slot: slot_no,
        quality: rank,
        stars: rune_class,
        set: set_id,
        level: upgrade_curr,
        cost: this.rune_upgrade_cost[rune_class > 10 ? rune_class - 10 : rune_class][upgraded ? upgrade_curr - 1 : upgrade_curr],
        success: upgraded,
    }

    const headers = [
        'id',
        'date',
        'slot',
        'quality',
        'stars',
        'set',
        'level',
        'cost',
        'success',
    ]

    const filename = sanitize(`${wizard_name}-${wizard_id}-rune-upgrades.csv`);
    this.saveToFile(data, filename, headers, proxy);
  },

  saveToFile(entry, filename, headers, proxy) {
    const csvData = [];
    const self = this;
    fs.ensureFile(path.join(config.Config.App.filesPath, filename), err => {
        if (err) { return; }
        csv.fromPath(path.join(config.Config.App.filesPath, filename), { ignoreEmpty: true, headers, renameHeaders: true })
        .on('data', data => {
            csvData.push(data);
        })
        .on('end', () => {
            csvData.push(entry);
            csv.writeToPath(path.join(config.Config.App.filesPath, filename), csvData, { headers })
            .on('finish', () => {
                proxy.log({
                    type: 'success',
                    source: 'plugin',
                    name: self.pluginName,
                    message: `Saved rune upgrade data to ${filename}`
                });
            });
        });
    });
   },
};