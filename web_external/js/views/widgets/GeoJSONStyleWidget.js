(function () {

    minerva.models.GeoJSONStyle = Backbone.Model.extend({
        defaults: {
            radius: 8,
            stroke: true,
            strokeWidth: 2,
            strokeColor: '#000000',
            strokeOpacity: 1,
            fill: true,
            fillOpacity: 0.75,
            fillColor: '#ff0000',
            strokeRamp: 'Blues',
            strokeColorKey: null,
            fillRamp: 'Reds',
            fillColorKey: null
        },
        ramps: _.map(colorbrewer, _.bind(function (ramp, name) {
            var n = "<ul class='m-color-ramp'>";
            _.each(ramp[6], function (color, i) {
                n += "<li style='background-color: " + color + "'/>";
            });
            n += '</ul>';
            this[name] = {
                value: ramp[6],
                display: n
            };
            return this;
        }, {}))[0]
    });
})();

minerva.views.GeoJSONStyleWidget = minerva.View.extend({
    events: {
        'change .m-toggle-panel': '_updatePanel',
        'click .panel-heading': '_collapsePanel',
        'change input,select': '_updateValue',
        'shown.bs.collapse .collapse': '_fixTooltips',
        'shown.bs.tab .m-style-tab': '_fixTooltips',
        'click .m-style-tab': '_activateTab',
        'change .m-color-by': 'render'
    },

    initialize: function (settings) {
        this._activeTab = 'point';
        this.load(settings.dataset);
    },
    render: function (evt) {
        var geoData = this._dataset.get('geoData') || {};
        this.$el.html(
            minerva.templates.geoJSONStyleWidget({
                point: this._pointStyle.attributes,
                line: this._lineStyle.attributes,
                polygon: this._polygonStyle.attributes,
                activeTab: this._activeTab,
                ramps: this._pointStyle.ramps,
                summary: geoData.summary || {}
            })
        );

        this.$('.m-slider').bootstrapSlider({enabled: false});
        this.$('.m-slider[data-slider-enabled]').bootstrapSlider('enable');
        this.$('select.m-select-ramp').selectpicker({width: '100%'});

        // needed to fix the initial position of tooltips
        $('#g-dialog-container').one('shown.bs.modal', _.bind(this._fixTooltips, this));
        return this;
    },

    /**
     * Load user selected values from the dataset.
     */
    load: function (dataset) {
        this._dataset = dataset;
        this._pointStyle = new minerva.models.GeoJSONStyle();
        this._lineStyle = new minerva.models.GeoJSONStyle();
        this._polygonStyle = new minerva.models.GeoJSONStyle();
        var mm = this._dataset.getMinervaMetadata() || {};
        var vis = mm.visProperties || {};
        this._pointStyle.set(vis.point || {});
        this._lineStyle.set(vis.line || {});
        this._polygonStyle.set(vis.polygon || {});
    },

    /**
     * Save the user selected values into the geojson object.
     */
    save: function () {
        var vis;
        var geoData = this._dataset.get('geoData') || {};
        var summary = geoData.summary || {};

        function makeScale(ramp, summary) {
            var scale, colors, n;

            colors = colorbrewer[ramp];
            // for an invalid ramp, just return black
            if (!colors) {
                return function () { return '#fffff'; };
            }
            indices = _.keys(colors).map(function (v) { return parseInt(v); });

            if (_.isObject(summary.values)) { // categorical
                n = _.sortedIndex(indices, _.size(summary.values));
                n = Math.min(n, indices.length - 1);

                scale = d3.scale.ordinal()
                    .domain(_.keys(summary.values))
                    .range(colors[indices[n]]);
            } else {                          // continuous
                n = indices.length - 1;
                scale = d3.scale.quantize()
                    .domain([summary.min, summary.max])
                    .range(colors[indices[n]]);
            }
            return scale;
        }

        function makeVis(style) {

            vis = _.extend({}, style.attributes);
            if (vis.strokeColorKey) {
                vis.strokeColor = _.compose(
                    makeScale(vis.strokeRamp, summary[vis.strokeColorKey]),
                    function (props) { return props[vis.strokeColorKey]; }
                );

            }

            if (vis.fillColorKey) {
                vis.fillColor = _.compose(
                    makeScale(vis.fillRamp, summary[vis.fillColorKey]),
                    function (props) { return props[vis.fillColorKey]; }
                );
            }
            return vis;
        }

        var props = {
            point: makeVis(this._pointStyle),
            line: makeVis(this._lineStyle),
            polygon: makeVis(this._polygonStyle)
        };
        var mm = this._dataset.getMinervaMetadata();
        mm.visProperties = props;
        this._dataset.saveMinervaMetadata(mm);
    },

    _fixTooltips: function () {
        this.$('.m-slider').bootstrapSlider('relayout');
    },
    _activateTab: function (evt) {
        var $el = $(evt.currentTarget);
        this.$($el.data('target')).tab('show');
        this._activeTab = $el.data('tab');
    },
    _updatePanel: function (evt) {
        var $el = $(evt.currentTarget);
        var val = $el.is(':checked');
        var panel = $el.closest('.panel');
        var controls = $el.closest('.panel').find('.panel-body input,select');
        var sliders = $el.closest('.panel').find('.panel-body .m-slider');
        if (val) {
            panel.removeClass('panel-default')
                .addClass('panel-primary');
            controls.prop('disabled', false);
            sliders.bootstrapSlider('enable');
        } else {
            panel.addClass('panel-default')
                .removeClass('panel-primary');
            controls.prop('disabled', true);
            sliders.bootstrapSlider('disable');
        }
    },
    _collapsePanel: function (evt) {
        evt.stopPropagation();
        var $el = $(evt.target);
        var target = $el.data('target');
        if (!$el.is('.m-toggle-panel')) {
            this.$(target).collapse('toggle');
        }
    },
    _updateValue: function (evt) {
        var $el = $(evt.target);
        var prop = $el.data('property');
        var val = $el.val();
        var feature;
        switch($el.prop('type')) {
            case 'number':
            case 'range':
                val = parseFloat(val);
                break;
            case 'checkbox':
                val = $el.is(':checked');
                break;
        }
        switch ($el.data('feature')) {
            case 'point':
                feature = this._pointStyle;
                break;
            case 'line':
                feature = this._lineStyle;
                break;
            case 'polygon':
                feature = this._polygonStyle;
                break;
            default:
                throw new Error('Invalid feature type in UI');
        }

        if (prop === 'strokeColorKey' || prop === 'fillColorKey') {
            if (val === 'Constant') {
                val = null;
            }
            feature.set(prop, val);
            this.render();
        } else {
            feature.set(prop, val);
        }
    }
});
