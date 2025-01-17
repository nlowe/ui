import Controller from '@ember/controller';
import {
  get,
  computed,
  set,
  observer,
  setProperties
} from '@ember/object';
import { loadStylesheet, proxifyUrl } from 'shared/utils/load-script';
import { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { isEmpty } from '@ember/utils';


export default Controller.extend({
  globalStore: service(),
  intl:        service(),
  router:      service(),

  needReloadSchema: false,
  reloadingSchema:  false,
  schemaReloaded:   false,

  clusterTemplateRevisions: alias('model.clusterTemplateRevisions'),

  actions: {
    launchCluster(provider) {
      const clusterTemplateRevisions = ( get(this, 'clusterTemplateRevisions') || [] ).filterBy('enabled');

      // check template revisions because if we have none active we can't use a cluster template
      if (isEmpty(clusterTemplateRevisions)) {
        this.router.transitionTo('global-admin.clusters.new.launch', provider);
      } else {
        this.router.transitionTo('global-admin.clusters.new.cluster-template', provider);
      }
    }
  },

  reloadSchema: observer('needReloadSchema', function() {
    if ( !this.reloadingSchema && this.needReloadSchema ) {
      set(this, 'reloadingSchema', true);

      this.globalStore.findAll('schema', {
        url:         '/v3/schemas',
        forceReload: true
      }).then(() => {
        setProperties(this, {
          schemaReloaded:  true,
          reloadingSchema: false
        });
      });
    }
  }),

  kontainerDrivers: computed('model.kontainerDrivers.@each.{id,state}', function() {
    const chinaCloud = ['tencentkubernetesengine', 'aliyunkubernetescontainerservice', 'huaweicontainercloudengine'];
    const nope       = ['import', 'rancherkubernetesengine'];
    const kDrivers   = get(this, 'model.kontainerDrivers') || [];
    const builtIn    = kDrivers.filter( (d) => d.state === 'active' && (d.builtIn || chinaCloud.indexOf(d.id) > -1) && !nope.includes(d.id));
    const custom     = kDrivers.filter( (d) => d.state === 'active' && !d.builtIn && d.hasUi);

    return {
      builtIn,
      custom
    }
  }),

  providerChoices: computed('model.nodeDrivers.{id,state}', 'schemaReloaded', 'intl.locale', 'kontainerDrivers.[]', function() {
    const { kontainerDrivers, intl  } = this;
    const { builtIn, custom } = kontainerDrivers;

    let out = [
      {
        name:        'googlegke',
        driver:      'googlegke',
        kontainerId: 'googlekubernetesengine',
      },
      {
        name:        'amazoneks',
        driver:      'amazoneks',
        kontainerId: 'amazonelasticcontainerservice',
      },
      {
        name:        'azureaks',
        driver:      'azureaks',
        kontainerId: 'azurekubernetesservice',
      },
      {
        name:        'tencenttke',
        driver:      'tencenttke',
        kontainerId: 'tencentkubernetesengine'
      },
      {
        name:        'aliyunkcs',
        driver:      'aliyunkcs',
        kontainerId: 'aliyunkubernetescontainerservice'
      },
      {
        name:        'huaweicce',
        driver:      'huaweicce',
        kontainerId: 'huaweicontainercloudengine'
      },
    ];

    out = out.filter( (o) => builtIn.findBy('id', o.kontainerId) );

    if (custom.length > 0) {
      custom.forEach( (c) => {
        const { name }           = c;
        const configName         = `${ name }EngineConfig`;
        const driverEngineSchema = this.globalStore.getById('schema', configName.toLowerCase());

        if ( driverEngineSchema ) {
          let {
            displayName, name: driver, id: kontainerId, name, genericIcon = true
          } = c;

          out.pushObject({
            displayName,
            driver,
            kontainerId,
            name,
            genericIcon
          });
        } else {
          set(this, 'needReloadSchema', true);
        }
      });
    }

    get(this, 'model.nodeDrivers').filterBy('state', 'active').sortBy('name').forEach((driver) => {
      const {
        name, hasUi, hasBuiltinIconOnly: hasIcon, uiUrl
      }                  = driver;
      const configName   = `${ name }Config`;
      const driverSchema = this.globalStore.getById('schema', configName.toLowerCase());

      if ( uiUrl ) {
        const cssUrl = proxifyUrl(uiUrl.replace(/\.js$/, '.css'), get(this, 'app.proxyEndpoint'));

        loadStylesheet(cssUrl, `driver-ui-css-${ name }`);
      }


      if ( driverSchema ) {
        out.push({
          name,
          driver:        'rke',
          genericIcon:   !hasUi && !hasIcon,
          nodeComponent: hasUi ? name : 'generic',
          nodeWhich:     name,
        });
      } else {
        set(this, 'needReloadSchema', true);
      }
    }),

    out.push({
      name:      'custom',
      driver:    'rke',
      nodeWhich: 'custom',
      preSave:   true
    });

    out.push({
      name:    'import',
      driver:  'import',
      preSave: true
    });

    out.forEach((driver) => {
      const key = `clusterNew.${ driver.name }.label`;

      if ( !get(driver, 'displayName') && intl.exists(key) ) {
        set(driver, 'displayName', intl.t(key));
      }
    });

    if ( get(this, 'isEdit') && get(this, 'cluster.rancherKubernetesEngineConfig') ) {
      out = out.filterBy('driver', 'rke');
    }

    out.sortBy('name');

    return out;
  }),

  providerGroups: computed('providerChoices.@each.{name,driver,nodeComponent,nodeWhich,preSave}', function() {
    const choices       = get(this, 'providerChoices');
    const rkeGroup      = [];
    const cloudGroup    = [];
    const customGroup   = [];
    const importGroup   = [];

    choices.forEach((item) => {
      if (get(item, 'driver') === 'rke' && get(item, 'name') !== 'custom') {
        rkeGroup.pushObject(item);
      } else if (get(item, 'driver') === 'import' && get(item, 'name') !== 'custom') {
        importGroup.pushObject(item);
      } else if (get(item, 'name') === 'custom') {
        customGroup.pushObject(item);
      } else {
        cloudGroup.pushObject(item);
      }
    });

    return {
      cloudGroup,
      customGroup,
      importGroup,
      rkeGroup,
    };
  }),


});
