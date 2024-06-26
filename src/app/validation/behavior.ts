/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { OrderedSet } from 'Molstar/mol-data/int';
import { EMQualityReport, EMQualityReportProvider } from './prop';
import {AtomInclusionThemeProvider, QscoreThemeProvider} from './color';
import { Loci } from 'Molstar/mol-model/loci';
import { StructureElement } from 'Molstar/mol-model/structure';
import { ParamDefinition as PD } from 'Molstar/mol-util/param-definition';
import { PluginBehavior } from 'Molstar/mol-plugin/behavior/behavior';

export const EMDBStructureQualityReport = PluginBehavior.create<{ autoAttach: boolean, showTooltip: boolean }>({
    name: 'emdb-structure-quality-report-prop',
    category: 'custom-props',
    display: {
        name: 'EM Structure Quality Report',
        description: 'Data from wwPDB Validation Report, obtained via EMDB.'
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showTooltip: boolean }> {

        private provider = EMQualityReportProvider;

        // TODO: Learn and fix this
        private labelValidation = {
            label: (loci: Loci): string | undefined => {
                if (!this.params.showTooltip) return void 0;

                switch (loci.kind) {
                    case 'element-loci':
                        if (loci.elements.length === 0) return void 0;
                        const e = loci.elements[0];
                        const u = e.unit;
                        if (!u.model.customProperties.hasReference(EMQualityReportProvider.descriptor)) return void 0;

                        const se = StructureElement.Location.create(loci.structure, u, u.elements[OrderedSet.getAt(e.indices, 0)]);
                        const scoreReport = EMQualityReport.getScores(se);
                        let score = 0;
                        if (scoreReport) {
                            score = scoreReport.score;
                        }
                        return `Score: ${score}`;

                    default: return void 0;
                }
            }
        };

        register(): void {
            this.ctx.customModelProperties.register(this.provider, this.params.autoAttach);
            this.ctx.managers.lociLabels.addProvider(this.labelValidation);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(QscoreThemeProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(AtomInclusionThemeProvider);
        }

        update(p: { autoAttach: boolean, showTooltip: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            this.params.showTooltip = p.showTooltip;
            this.ctx.customModelProperties.setDefaultAutoAttach(this.provider.descriptor.name, this.params.autoAttach);
            return updated;
        }

        unregister() {
            this.ctx.customModelProperties.unregister(EMQualityReportProvider.descriptor.name);
            this.ctx.managers.lociLabels.removeProvider(this.labelValidation);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(QscoreThemeProvider);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(AtomInclusionThemeProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(false),
        showTooltip: PD.Boolean(true)
    })
});