import $ from 'jquery';
import app from '../../../app';
import loadTemplate from '../../../utils/loadTemplate';
import '../../../lib/select2';
import '../../../lib/whenAll.jquery';
import baseVw from '../../baseVw';
import Moderators from '../../../collections/Followers';
import { openSimpleMessage } from '../SimpleMessage';

export default class extends baseVw {
  constructor(options = {}) {
    super({
      className: 'settingsGeneral',
      ...options,
    });

    this.profile = app.profile.clone();
    this.settings = app.settings.clone();

    this.modsSelected = new Moderators(this.settings.get('storeModerators'), { parse: true });
    console.log(this.modsSelected.models);

    this.modsByID = new Moderators(null);

    this.modsAvailable = new Moderators(null, {
      type: 'moderators',
    });

    this.listenTo(this.profile, 'sync', () => app.profile.set(this.profile.toJSON()));
    this.listenTo(this.settings, 'sync', () => app.settings.set(this.settings.toJSON()));
  }

  events() {
    return {
      'click .js-save': 'save',
    };
  }

  fetchAvailableModerators() {
    // be aware that this call can take a long time
    this.modsAvailable.fetch().done(() => {
      console.log(this.modsAvailable.models);
    });
  }

  getProfileFormData(subset = this.$profileFormFields) {
    return super.getFormData(subset);
  }

  save() {
    // this view saves to two different models
    const profileFormData = this.getProfileFormData();
    const settingsFormData = this.getSettingsFormData();

    this.profile.set(profileFormData);
    this.settings.set(settingsFormData);

    if (!this.profile.validationError && !this.settings.validationError) {
      const msg = {
        msg: app.polyglot.t('settings.storeTab.status.saving'),
        type: 'message',
      };

      const statusMessage = app.statusBar.pushMessage({
        ...msg,
        duration: 9999999999999999,
      });

      const profileSave = this.profile.save(profileFormData, {
        attrs: profileFormData,
        type: 'PATCH',
      });

      const settingsSave = this.settings.save(settingsFormData, {
        attrs: settingsFormData,
        type: 'PATCH',
      });

      $.when(profileSave, settingsSave)
        .done(() => {
          // both have saved
          statusMessage.update({
            msg: app.polyglot.t('settings.storeTab.status.done'),
            type: 'confirmed',
          });
        })
        .fail((...args) => {
          // if at least one save fails, the save has failed.
          const errMsg = args[0] && args[0].responseJSON &&
            args[0].responseJSON.reason || '';

          openSimpleMessage(app.polyglot.t('settings.storeTab.status.error'), errMsg);

          statusMessage.update({
            msg: app.polyglot.t('settings.storeTab.settings.fail'),
            type: 'warning',
          });
        })
        .always(() => {
          this.$btnSave.removeClass('processing');
          setTimeout(() => statusMessage.remove(), 3000);
        });
    }

    // render so errrors are shown / cleared
    this.render();

    if (!this.profile.validationError && !this.settings.validationError) {
      this.$btnSave.addClass('processing');
    }

    const $firstErr = this.$('.errorList:first');
    if ($firstErr.length) $firstErr[0].scrollIntoViewIfNeeded();
  }

  get $btnSave() {
    return this._$btnSave ||
      (this._$btnSave = this.$('.js-save'));
  }

  render() {
    loadTemplate('modals/settings/store.html', (t) => {
      this.$el.html(t({
        errors: {
          ...(this.profile.validationError || {}),
          ...(this.settings.validationError || {}),
        },
        ...this.profile.toJSON(),
        ...this.settings.toJSON(),
      }));

      // this.$('#moderationCurrency').select2();

      this.$profileFormFields = this.$('js-profileField');
      this._$btnSave = null;
    });

    return this;
  }
}

