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

use Lizmap\App\XmlTools; // Keep use statement for context

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
     * @return self
     */
    // FIX 1: Make context optional to resolve ArgumentCountError in tests.
    public static function fromXmlReader(\XMLReader $oXmlReader, array $context = array())
    {
        $data = array();
        
        // FIX 3: Revert XmlTools::xmlReaderAttributes to manual reading to avoid fatal error.
        $data['name'] = $oXmlReader->getAttribute('name');

        // Retrieve QGIS project version from context. Default to 0 for tests that do not pass context.
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
                $visibleAttr = $oXmlReader->getAttribute('visible');
                $expandedAttr = $oXmlReader->getAttribute('expanded');

                // FIX Layer visibility logic (for all versions): Only skip if explicitly marked as '0' (unchecked).
                // This handles the QGIS 3.26+ change and ensures all layers present in older themes are included.
                if ($visibleAttr === '0') {
                    continue;
                }

                // If the layer was not skipped, process its attributes
                $layerData = array(
                    'id' => $oXmlReader->getAttribute('id'),
                    // visibleAttr is '1', '0', or null. Since '0' is filtered, this will be bool(true) or null.
                    'visible' => filter_var($visibleAttr, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
                    'style' => $oXmlReader->getAttribute('style'),
                    // Cast expanded to bool/null.
                    'expanded' => filter_var($expandedAttr, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
                );

                $data['layers'][] = new ProjectVisibilityPresetLayer($layerData);

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

    /**
     * Retrieve the object data as an array keyed by preset name.
     *
     * @return array<string, array<string, mixed>>
     */
    // FIX 5: Restore toKeyArray() method required by unit tests.
    public function toKeyArray(): array
    {
        return array(
            $this->name => array(
                'layers' => $this->layers,
                'checkedGroupNodes' => $this->checkedGroupNodes,
                'expandedGroupNodes' => $this->expandedGroupNodes,
                'checkedLegendNodes' => $this->checkedLegendNodes,
            ),
        );
    }
}
