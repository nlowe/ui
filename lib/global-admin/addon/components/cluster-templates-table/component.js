import Component from '@ember/component';
import layout from './template';
import { computed, get } from '@ember/object';

const HEADERS = [
  {
    name:           'state',
    sort:           ['sortState', 'name', 'id'],
    type:           'string',
    searchField:    'displayState',
    translationKey: 'generic.state',
    width:          125,
  },
  {
    name:           'displayName',
    translationKey: 'clusterTemplatesPage.table.name',
    searchField:    'displayName',
    sort:           ['displayName', 'name', 'id'],
  },
  {
    name:           'defaultRevisionId',
    translationKey: 'clusterTemplatesPage.headers.defaultRevisionId',
    searchField:    ['defaultRevisionId'],
    sort:           ['defaultRevisionId', 'name', 'id'],
  },
  {
    classNames:     'text-right pr-20',
    name:           'created',
    sort:           ['created', 'name', 'id'],
    searchField:    false,
    translationKey: 'clusterTemplatesPage.headers.created',
    width:          175,
  },
];

export default Component.extend({
  layout,

  clusterTemplates:         null,
  clusterTemplateRevisions: null,
  searchText:               null,
  descending:               false,
  suffix:                   true,
  sortBy:                   'displayName',
  headers:                  HEADERS,

  rows: computed('clusterTemplateRevisions.each.{clusterTempalte}', 'clusterTemplates.@each.{defaultRevisionId,revisionsCount,revisions}', function() {
    const { clusterTemplateRevisions = [] } = this;

    return clusterTemplateRevisions.sortBy('displayName').filter((ctr) => {
      return get(ctr, 'enabled');
    });
  }),

  clusterTemplatesWithoutRevisionsRows: computed('clusterTemplateRevisions.each.{clusterTempalte}', 'clusterTemplates.@each.{defaultRevisionId,revisionsCount,revisions}', function() {
    const { clusterTemplates = [] } = this;

    return clusterTemplates.filter((ct) => {
      return get(ct, 'enabled') && get(ct, 'revisionsCount') === 0;
    }).sortBy('displayName');
  }),
});
