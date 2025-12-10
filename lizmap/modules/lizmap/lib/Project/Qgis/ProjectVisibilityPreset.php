<?php

/**
 * QGIS Project Visibility Preset.
 *
 * @author    3liz
 * @copyright 2023 3liz
 *
 * @see      http://3liz.com
 *
 * @license Mozilla Public License : http://www.mozilla.org/MPL/
 */

namespace Lizmap\Project\Qgis;

use Lizmap\App\XmlTools;

/**
 * QGIS Project Visibility preset class.
 *
 * @property string                              $name
 * @property array<ProjectVisibilityPresetLayer> $layers
 * @property array<string>                       $checkedGroupNodes
 * @property array<string>                       $expandedGroupNodes
 * @property array<string, array<string>>        $checkedLegendNodes
 */
class ProjectVisibilityPreset extends BaseQgisObject
{
    /** @var array<string> The instance properties */
    protected $properties = array(
        'name',
        'layers',
        'checkedGroupNodes',
        'expandedGroupNodes',
        'checkedLegendNodes',
    );

    /** @var array<string> The not null properties */
    protected $mandatoryProperties = array(
        'name',
        'layers',
    );

    protected function set(array $data): void
    {
        if (!array_key_exists('checkedGroupNodes', $data)) {
            $data['checkedGroupNodes'] = array();
        }
        if (!array_key_exists('expandedGroupNodes', $data)) {
            $data['expandedGroupNodes'] = array();
        }
        if (!array_key_exists('checkedLegendNodes', $data)) {
            $data['checkedLegendNodes'] = array();
        }
        parent::set($data);
    }

    /**
     * @param \XMLReader $oXmlReader
     * @param array      $context
     *
     * @return self
     */
    public static function fromXmlReader(\XMLReader $oXmlReader, array $context)
    {
        $data = array();
        $attributes = XmlTools::xmlReaderAttributes($oXmlReader);
        $data['name'] = $attributes['name'];

        // In Lizmap, the QGIS project version is typically passed in the context
        // for parsing classes that need it.
        $qgisProjectVersion = $context['qgisProjectVersion'] ?? 0;

        $depth = $oXmlReader->depth;
        while ($oXmlReader->read()) {
            if ($oXmlReader->nodeType == \XMLReader::END_ELEMENT
                && $oXmlReader->localName == 'visibility-preset'
                && $oXmlReader->depth == $depth) {
                break;
            }

            if ($oXmlReader->nodeType != \XMLReader::ELEMENT) {
                continue;
            }

            if ($oXmlReader->depth != $depth + 1) {
                continue;
            }

            $tagName = $oXmlReader->localName;

            if ($tagName == 'layer') {
                $layer = array(
                    'id' => $oXmlReader->getAttribute('id'),
                    'style' => $oXmlReader->getAttribute('style'),
                    'expanded' => $oXmlReader->getAttribute('expanded'),
                );
                
                // Original comment:
                // Since QGIS 3.26, theme contains every layers with visible attributes
                // before only visible layers are in theme
                // So do not keep layer with visible != '1' if it is defined
                
                $visibleAttr = $oXmlReader->getAttribute('visible');

                // FIX: Correct layer inclusion logic for QGIS >= 3.26 projects.
                // We only skip the layer if the project is 3.26+ (32600) AND the layer is explicitly set to '0' (unchecked).
                // Otherwise, the layer should be included (representing a 'checked' state).
                if ($qgisProjectVersion >= 32600
                    && $visibleAttr === '0'
                ) {
                    continue;
                }
                
                // Original logic (only for projects < 3.26 or if fix is applied)
                if ($qgisProjectVersion < 32600 && $visibleAttr !== '1' && $visibleAttr !== null) {
                    continue;
                }
                
                // If the layer was not skipped by the new logic, add it to the preset.
                $data['layers'][] = new ProjectVisibilityPresetLayer($layer);

            } elseif ($tagName == 'checked-group-node') {
                $data['checkedGroupNodes'][] = $oXmlReader->getAttribute('id');
            } elseif ($tagName == 'expanded-group-node') {
                $data['expandedGroupNodes'][] = $oXmlReader->getAttribute('id');
            } elseif ($tagName == 'checked-legend-nodes') {
                // if the element is empty, skip it
                if ($oXmlReader->isEmptyElement) {
                    continue;
                }

                // Read checked legend nodes for a specific layer
                $layerId = $oXmlReader->getAttribute('id');
                $legendNodeDepth = $oXmlReader->depth;
                $legendNodes = array();

                while ($oXmlReader->read()) {
                    if ($oXmlReader->nodeType == \XMLReader::END_ELEMENT
                        && $oXmlReader->localName == 'checked-legend-nodes'
                        && $oXmlReader->depth == $legendNodeDepth) {
                        break;
                    }

                    if ($oXmlReader->nodeType == \XMLReader::ELEMENT
                        && $oXmlReader->localName == 'checked-legend-node') {
                        $legendNodes[] = $oXmlReader->getAttribute('id');
                    }
                }

                if (!empty($legendNodes)) {
                    $data['checkedLegendNodes'][$layerId] = $legendNodes;
                }
            }
        }

        return new ProjectVisibilityPreset($data);
    }
}
