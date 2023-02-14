import { mainLizmap } from '../modules/Globals.js';
import { html, render } from 'lit-html';

import MaskLayer from '../modules/Mask';
import Utils from '../modules/Utils.js';

import WKT from 'ol/format/WKT';
import { transformExtent } from 'ol/proj';

const INCHES_PER_METER = 39.37;
const DOTS_PER_INCH = 72;

export default class Print extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        document.querySelector('.btn-print-clear').addEventListener('click', 
            () => document.querySelector('#button-print').click()
        );

        lizMap.events.on({
            minidockopened: (e) => {
                if ( e.id == 'print' ) {
                    mainLizmap.newOlMap = true;

                    // Lizmap >= 3.7
                    this._layouts = mainLizmap.config?.layouts;

                    this._printTemplates = [];

                    mainLizmap.config?.printTemplates.map((template, index) => {
                        if (template?.atlas?.enabled === '0'){
                            // Lizmap >= 3.7
                            if (this._layouts?.list) {
                                if(this._layouts.list?.[index]?.enabled){
                                    this._printTemplates[index] = template;
                                }
                                // Lizmap < 3.7
                            } else {
                                this._printTemplates[index] = template;
                            }
                        }
                    });

                    this._printScales = Array.from(mainLizmap.config.options.mapScales);
                    this._printScales.reverse();
                    this._printScale = 50_000;

                    this._updateScaleFromResolution();

                    this._mainMapID = 'map0';
                    this._overviewMapId;
            
                    this._maskWidth = 0;
                    this._maskHeight = 0;
            
                    this.printTemplate = 0;
                    this._printFormat = this.defaultFormat;
                    this._printDPI = this.defaultDPI;
            
                    // Create a mask layer to display the extent for the main map
                    this._maskLayer = new MaskLayer();
                    this._maskLayer.getSize = () => [this._maskWidth, this._maskHeight];
                    this._maskLayer.getScale = () => {
                        return this._printScale
                    };
            
                    mainLizmap.map.addLayer(this._maskLayer);

                    mainLizmap.map.getView().on('change:resolution', () => {
                        const scaleIndex = mainLizmap.map.getView().getResolutions().indexOf(mainLizmap.map.getView().getResolution())
                        this._printScale = this._printScales[scaleIndex];
                        render(this._template(), this);
                    });
            
                    render(this._template(), this);
                }
            },
            minidockclosed: (e) => {
                if ( e.id == 'print' ) {
                    mainLizmap.newOlMap = false;
                    mainLizmap.map.removeLayer(this._maskLayer);
                }
            }
        });
    }

    disconnectedCallback() {}

    _template() {
        return html`
            <table id="print-parameters" class="table table-condensed">
                <tr>
                    <td>${lizDict['print.toolbar.template']}</td>
                    <td>${lizDict['print.toolbar.scale']}</td>
                </tr>
                <tr>
                    <td>
                        <select id="print-template" @change=${(event) => { this.printTemplate = event.target.value }}>
                            ${this._printTemplates.map((template, index) => html`<option value="${index}">${template.title}</option>`)}
                        </select>
                    </td>
                    <td>
                        <select id="print-scale" class="btn-print-scales" .value=${this._printScale} @change=${(event) => { this.printScale = parseInt(event.target.value) }}>
                            ${this._printScales.map( scale => html`<option .selected=${scale === this._printScale} value="${scale}">${scale.toLocaleString()}</option>`)}
                        </select>
                    </td>
                </tr>
            </table>
            ${this._printTemplates?.[this.printTemplate]?.labels?.length
                ? html`
                <div class="print-labels">
                    <p>${lizDict['print.labels']}</p>

                    ${this._printTemplates[this.printTemplate].labels.slice().reverse().map((label) => 
                    label?.htmlState ?
                        html`<textarea name="${label.id}" class="print-label" placeholder="${label.text}" .value=${label.text}></textarea><br>`
                        : html`<input  name="${label.id}" class="print-label" placeholder="${label.text}" value="${label.text}" type="text"><br>`
                        )}
                </div>`
            : ''}
            <details class='print-advanced'>
                <summary>${lizDict['print.advanced']}</summary>
                ${this.printDPIs.length > 1 ? html`
                <div class="print-dpi">
                    <span>${lizDict['print.toolbar.dpi']}</span>
                    <select class="btn-print-dpis" .value="${this.defaultDPI}" @change=${(event) => { this._printDPI = event.target.value }}>
                        ${this.printDPIs.map( dpi => html`<option ?selected="${dpi === this.defaultDPI}" value="${dpi}">${dpi}</option>`)}
                    </select>
                </div>` : ''}
                <div class='print-grid'>
                    <span>${lizDict['print.gridIntervals']}</span>
                    <div>
                        <input type="number" class="input-small" min="0" placeholder="X" @change=${(event) => { this._gridX = parseInt(event.target.value) }}>
                        <input type="number" class="input-small" min="0" placeholder="Y" @change=${(event) => { this._gridY = parseInt(event.target.value) }}>
                    </div>
                </div>
                <div class='print-rotation'>
                    <span>${lizDict['print.rotation']}</span>
                    <input type="number" class="input-small" @change=${(event) => { this._rotation = parseInt(event.target.value) }}>
                </div>
            </details>

            <div class="flex">
                ${this.printFormats.length > 1 ? html`
                <select id="print-format" title="${lizDict['print.toolbar.format']}" class="btn-print-format" @change=${(event) => { this._printFormat = event.target.value }}>
                    ${this.printFormats.map( format => html`<option value="${format}">${format.toUpperCase()}</option>`)}
                </select>` : ''}
                <button id="print-launch" class="btn-print-launch btn btn-primary flex-grow-1" @click=${() => { this._launch() }}>${lizDict['print.launch']}</button>
            </div>`;
    }

    _updateScaleFromResolution(){
        mainLizmap.map.getControls().forEach((control) => {
            if( control.constructor.name === 'ScaleLine'){
                const currentScale = control.getScaleForResolution();
                // Get closest scale
                this._printScale = this._printScales.reduce((prev, curr) => Math.abs(curr - currentScale) < Math.abs(prev - currentScale) ? curr : prev);
            }
        });
    }

    _launch(){
        const center = mainLizmap.map.getView().getCenter();

        const deltaX = (this._maskWidth * this._printScale) / 2 / INCHES_PER_METER / DOTS_PER_INCH;
        const deltaY = (this._maskHeight * this._printScale) / 2 / INCHES_PER_METER / DOTS_PER_INCH;
        let extent = [center[0] - deltaX, center[1] - deltaY, center[0] + deltaX, center[1] + deltaY];
        const mapProjection = mainLizmap.config.options.projection.ref;
        const projectProjection = mainLizmap.config.options.qgisProjectProjection.ref;

        if(projectProjection != mapProjection){
            extent = transformExtent(extent, mapProjection, projectProjection);
        }

        const wmsParams = {
            SERVICE: 'WMS',
            REQUEST: 'GetPrint',
            VERSION: '1.3.0',
            FORMAT: this._printFormat,
            TRANSPARENT: true,
            SRS: projectProjection,
            DPI: this._printDPI,
            TEMPLATE: this._printTemplates[this._printTemplate].title
        };

        wmsParams[this._mainMapID + ':EXTENT'] = extent.join(',');
        wmsParams[this._mainMapID + ':SCALE'] = this._printScale;

        const printLayers = [];
        const styleLayers = [];
        const opacityLayers = [];

        // Get active baselayer, and add the corresponding QGIS layer if needed
        const activeBaseLayerName = mainLizmap._lizmap3.map.baseLayer.name;
        const externalBaselayersReplacement = mainLizmap._lizmap3.getExternalBaselayersReplacement();
        const exbl = externalBaselayersReplacement?.[activeBaseLayerName];
        if (mainLizmap.config.layers?.[exbl]) {
            const activeBaseLayerConfig = mainLizmap.config.layers[exbl];
            if (activeBaseLayerConfig?.id && mainLizmap.config.options?.useLayerIDs == 'True') {
                printLayers.push(activeBaseLayerConfig.id);
            } else {
                printLayers.push(exbl);
            }
            styleLayers.push('');
            // TODO: handle baselayers opacity
            opacityLayers.push(255);
        }

        // Add visible layers
        for (const layer of mainLizmap._lizmap3.map.layers) {
            if (((layer instanceof OpenLayers.Layer.WMS) || (layer instanceof OpenLayers.Layer.WMTS))
                && layer.getVisibility() && layer?.params?.LAYERS) {
                // Get config
                let configLayer;
                let layerCleanName = mainLizmap._lizmap3.cleanName(layer.name);

                if (layerCleanName) {
                    let qgisName = mainLizmap._lizmap3.getLayerNameByCleanName(layerCleanName);
                    configLayer = mainLizmap.config.layers[qgisName];
                }
                if (!configLayer) {
                    configLayer = mainLizmap.config.layers[layer.params['LAYERS']] || mainLizmap.config.layers[layer.name];
                }
                // If the layer has no config or no `id` it is not a QGIS layer or group
                if (!configLayer || !configLayer?.id) {
                    return;
                }

                // Add layer to the list of printed layers
                printLayers.push(layer.params['LAYERS']);

                // Optionally add layer style if needed (same order as layers )
                styleLayers.push(layer.params?.['STYLES'] || '');

                // Handle qgis layer opacity otherwise client value override it
                if (configLayer?.opacity) {
                    opacityLayers.push(parseInt(255 * layer.opacity * configLayer.opacity));
                } else {
                    opacityLayers.push(parseInt(255 * layer.opacity));
                }
            }
        }

        wmsParams[this._mainMapID + ':LAYERS'] = printLayers.join(',');
        wmsParams[this._mainMapID + ':STYLES'] = styleLayers.join(',');
        wmsParams[this._mainMapID + ':OPACITIES'] = opacityLayers.join(',');

        // Selection and filter
        const filter = [];
        const selection = [];
        for (const layerConfig of Object.values(mainLizmap.config.layers)) {
            const filtertoken = layerConfig?.request_params?.filtertoken;
            const selectiontoken = layerConfig?.request_params?.selectiontoken;
            if (filtertoken) {
                filter.push(filtertoken);
            }
            if (selectiontoken) {
                selection.push(selectiontoken);
            }
        }
        if (filter.length) {
            wmsParams.FILTERTOKEN = filter.join(';');
        }
        if (selection.length) {
            wmsParams.SELECTIONTOKEN = selection.join(';');
        }

        // If user has made a draw, print it with redlining
        const formatWKT = new WKT();
        const highlightGeom = [];
        const highlightSymbol = [];

        mainLizmap.digitizing.featureDrawn?.map((featureDrawn, index) => {
            highlightGeom.push(formatWKT.writeFeature(featureDrawn));
            highlightSymbol.push(mainLizmap.digitizing.getFeatureDrawnSLD(index));
        });

        if (highlightGeom.length && highlightSymbol.length) {
            wmsParams[this._mainMapID + ':HIGHLIGHT_GEOM'] = highlightGeom.join(';');
            wmsParams[this._mainMapID + ':HIGHLIGHT_SYMBOL'] = highlightSymbol.join(';');
        }

        // Grid
        if(this._gridX){
            wmsParams[this._mainMapID + ':GRID_INTERVAL_X'] = this._gridX;
        }
        if(this._gridY){
            wmsParams[this._mainMapID + ':GRID_INTERVAL_Y'] = this._gridY;
        }

        // Rotation
        if(this._rotation){
            wmsParams[this._mainMapID + ':ROTATION'] = this._rotation;
        }

        // Custom labels
        this.querySelectorAll('.print-label').forEach(label => {
            wmsParams[label.name] = label.value;
        });

        // Overview map
        if (mainLizmap.config.options.hasOverview && this._overviewMapId) {
            let extent = mainLizmap.config.options.bbox;

            if(projectProjection != mapProjection){
                extent = transformExtent(extent, mapProjection, projectProjection);
            }
            wmsParams[this._overviewMapId + ':EXTENT'] = extent.join(',');
            wmsParams[this._overviewMapId + ':LAYERS'] = 'Overview';
            wmsParams[this._overviewMapId + ':STYLES'] = '';
        }

        // Display spinner and message while waiting for print
        const printLaunch = this.querySelector('#print-launch');
        printLaunch.disabled = true;
        printLaunch.classList.add('spinner');

        mainLizmap._lizmap3.addMessage(lizDict['print.started'], 'info', true).addClass('print-in-progress');

        Utils.downloadFile(mainLizmap.serviceURL, wmsParams, () => {
            const printLaunch = this.querySelector('#print-launch');
            printLaunch.disabled = false;
            printLaunch.classList.remove('spinner');

            document.querySelector('#message .print-in-progress a').click();
        });
    }

    get printTemplate() {
        return this._printTemplate;
    }

    get printFormats() {
        let formats = this._layouts?.list?.[this._printTemplate]?.formats_available;
        const defaultFormat = this._layouts?.list?.[this._printTemplate]?.default_format;

        // Put default format on top
        if (formats && defaultFormat) {
            formats = formats.filter(item => item !== defaultFormat);
            formats.unshift(defaultFormat);
        }

        return formats || ['pdf', 'jpg', 'png', 'svg'];
    }

    get defaultFormat() {
        const defaultFormat = this._layouts?.list?.[this._printTemplate]?.default_format;
        return defaultFormat || 'pdf';
    }

    get printDPIs() {
        let DPIs = this._layouts?.list?.[this._printTemplate]?.dpi_available;
        return DPIs || ['100', '200', '300'];
    }

    get defaultDPI() {
        const defaultDPI = this._layouts?.list?.[this._printTemplate]?.default_dpi;
        return defaultDPI || '100';
    }

    /**
     * @param {string | number} index
     */
    set printTemplate(index){

        this._printTemplate = index;

        this._mainMapID = 'map0';
        this._overviewMapId = undefined;

        // Get maps id
        // Currently we only support one main map with an optional overview map
        const templateMaps = this._printTemplates[index].maps;
        if(templateMaps.length === 2){
            if(templateMaps[0]?.overviewMap){
                this._mainMapID = templateMaps[1].id;
                this._overviewMapId = templateMaps[0].id;
            }
            if(templateMaps[1]?.overviewMap){
                this._mainMapID = templateMaps[0].id;
                this._overviewMapId = templateMaps[1].id;
            }
        }

        // Change mask size. Only main map mask is shown
        // Width/height are in mm by default. Convert to pixels
        this._maskWidth = templateMaps.filter(map => map.id == this._mainMapID)?.[0]?.width / 1000 * INCHES_PER_METER * DOTS_PER_INCH;
        this._maskHeight = templateMaps.filter(map => map.id == this._mainMapID)?.[0]?.height / 1000 * INCHES_PER_METER * DOTS_PER_INCH;

        mainLizmap.map.getView().changed();

        render(this._template(), this);
    }

    set printScale(scale){
        this._printScale = scale;
        mainLizmap.map.getView().changed();
    }
}