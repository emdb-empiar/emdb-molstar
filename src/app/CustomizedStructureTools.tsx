import {StructureSourceControls} from 'Molstar/mol-plugin-ui/structure/source';
import {StructureMeasurementsControls} from 'Molstar/mol-plugin-ui/structure/measurements';
import {StructureSuperpositionControls} from 'Molstar/mol-plugin-ui/structure/superposition';
import {StructureQuickStylesControls} from 'Molstar/mol-plugin-ui/structure/quick-styles';
import {StructureComponentControls} from 'Molstar/mol-plugin-ui/structure/components';
import {VolumeSourceControls, VolumeStreamingControls} from 'Molstar/mol-plugin-ui/structure/volume';
import {CustomStructureControls} from 'Molstar/mol-plugin-ui/controls';
import {PluginConfig} from 'Molstar/mol-plugin/config';
import {PluginUIComponent} from 'Molstar/mol-plugin-ui/base';
import {BuildSvg, Icon} from 'Molstar/mol-plugin-ui/controls/icons';

export class CustomizedStructureTools extends PluginUIComponent {
    render() {
        return <>
            <div className='msp-section-header'><Icon svg={BuildSvg} />Structure Tools</div>

            <StructureSourceControls initiallyCollapsed />
            <StructureMeasurementsControls initiallyCollapsed />
            <StructureSuperpositionControls initiallyCollapsed />
            <StructureQuickStylesControls initiallyCollapsed />
            <StructureComponentControls />
            {this.plugin.config.get(PluginConfig.VolumeStreaming.Enabled) && <VolumeStreamingControls />}
            <VolumeSourceControls />
            <CustomStructureControls />
        </>;
    }
}