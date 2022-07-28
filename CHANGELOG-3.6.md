# Changelog Lizmap 3.6

## Unreleased

### Added

* **Maps**: take care of `filter` and `popup` parameters from the url when viewing a map
  in order to zoom directly to the defined features and to display popups
* **Maps**: When an error appeared during the load of a project, the user interface
  has been improved to show a better message, instead of the unreadable "SERVICE NON DISPONIBLE" error message.
* **Administration**: add a new page in the admin panel showing the **list of published projects**
  in a dynamic table.

  * **visible properties**: `repository`, project `name`, `modification date`, `projection`,
    `layer count`, `qgis desktop version`, `lizmap plugin version`, `authorized groups`
  * The background of some properties are **colored based on the values**
    to help the admin see what must be corrected:
    * QGIS version:
      * `lightyellow` if the version is old compared to the QGIS Server (minor version difference > 6)
      * `lightcoral` if the QGIS desktop version is above the installed QGIS Server version
    * Layer count:
      * `lightyellow` if above 100,
      * `lightcoral` if above 200
    * Projection:
      * `lightcoral` if it is a user defined projection
  * **Tooltips** have been added to show more information on hover
    * Repository: shows the label
    * Project name: shows the project `title` and `abstract`
    * QGIS version, layer count and projection: shows a help message if an issue has been detected
  * The admin user will be able to **sort the projects* by clicking on the columns header
    or **filter the list** by typing the searched value in the top text input.
  * A right **sidebar** shows the project information when a line is selected: project image, title, abstract.
  * More project properties are shown if the proprietary tool `qgis-project-validator` has been used to
    generate the expected JSON and LOG files for each project:
    * **Invalid layers** count and list of layer names with the `datasource` visible in the tooltip
    * **Memory used** to load the project (in Mo)
    * **Loading time** of the project (in seconds)
    * **QGIS Log file** written when loading the project
  * Funded by **Valabre** (Centre de gravité de la formation des métiers de la Sécurité Civile,
    de la Recherche, des Nouvelles Technologies et de la Prévention dans le domaine des risques naturels)
* **Administration** new interface to manager rights, easier to use, especially when there are many groups
* **Layer legend**: Enable auto display the legend image for a layer at startup
* **Edition**: New button to restart drawing geometry - Provide the capability to update geometry with GPS and form coordinates
* New `-dry-run` for the cache generation to see how many tiles might be generated

### Fixed

* Fix the download of files (layer export, PDF) depending on the web-browser (and its version)
* Selected theme can be selected again without selecting another one before
* The style was not updated when the layer has a shortname and was included in a QGIS theme
* CLI tool about cache : fix an issue about the `-bbox` parameter out of the tile matrix limit
* Provide the dataviz button in the left menu only there is at least one non filtered dataviz
* Javascript error when clicking on an atlas link when no feature ID was found
* Fix infinite HTTP loop when the user hasn't any access to the default project
* Fix the attribute table order defined in QGIS desktop
* Fix the "zoom to layer" button when the layer is in EPSG:4326 (Funded by Geocobet)
* When a layer has a shortname, fix one issue about dataviz & relations and fix the children popup wasn't displayed
* Dataviz & relations - Fix possible bug when layer has a shortname

### Changed

* Improve the table in the right's management panel when having a dozen of groups
* Add tolerance for clicking on mobile to get the popup
* Do not build the attribute table when refreshing attribute table

### Backend

* Support from PHP 7.4 to 8.1
* Lizmap QGIS server plugin has been split in two different plugins : server and desktop
* Internal PHP code
  * New method in `AppContext` to get user public groups id
  * Convert QGIS XML `Option` value based on type attribute
  * Add a revision parameter on assets url for cache
  * Add ETag HTTP header to GetCapabilities, GetProjectConfig, GetProj4 and WMTS GetTile responses
  * New class `\Lizmap\Request\OGCResponse`
* Update Jelix to 1.8-pre
* Update PHP CS Fixer to 3.8.0
* Update to NodeJS 16

### Translations

* Update from Transifex about translated strings
* New Norwegian language

### Tests

* End2End: Add Lizmap Service requests tests
* End2End: Update Cypress to 9.5.0
* Use the new command line `docker compose`

## 3.6.0-beta.1 - 2022-07-27

* First release of the beta version