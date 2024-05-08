/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { EMQualityReport, EMQualityReportProvider } from './prop';
import { Location } from 'Molstar/mol-model/location';
import { StructureElement } from 'Molstar/mol-model/structure';
import { ColorTheme, LocationColor } from 'Molstar/mol-theme/color';
import { ThemeDataContext } from 'Molstar/mol-theme/theme';
import { Color } from 'Molstar/mol-util/color';
import { TableLegend } from 'Molstar/mol-util/legend';
import { ParamDefinition as PD } from 'Molstar/mol-util/param-definition';
import { CustomProperty } from 'Molstar/mol-model-props/common/custom-property';

const ValidationColorTable: [string, Color][] = [
    ['>= 0', Color(16711935)],
    ['0.094', Color(8001303)],
    ['0.109', Color(8002331)],
    ['0.212', Color(8009270)],
    ['0.347', Color(8018008)],
    ['0.518', Color(8029316)],
    ['0.607', Color(8034970)],
    ['0.733', Color(8043194)],
    ['0.817', Color(8048848)],
    ['0.99', Color(8060156)],
];


export const StructureQualityReportColorThemeParams = {
    type: PD.Text('ai', { isHidden: true }) // FIXME
};

type Params = typeof StructureQualityReportColorThemeParams

export function StructureQualityReportColorTheme(ctx: ThemeDataContext, props: PD.Values<Params>): ColorTheme<Params> {
    let color: LocationColor;

    if (ctx.structure && !ctx.structure.isEmpty && ctx.structure.models[0].customProperties.has(EMQualityReportProvider.descriptor)) {
        const getScores = EMQualityReport.getScores;

        color = (location: Location) => {
            if (StructureElement.Location.is(location)) {
                const emScore = getScores(location);
                if (emScore && emScore.color) {
                    const numericColor = Number(`0x${emScore.color.substr(1)}`);
                    return Color(numericColor);
                }
            }
            return Color.fromRgb(170, 170, 170);
        };
    } else {
        color = () => Color.fromRgb(170, 170, 170);
    }

    return {
        factory: StructureQualityReportColorTheme,
        granularity: 'group',
        preferSmoothing: true,
        color: color,
        props: props,
        description: 'Assigns residue colors according to the number of quality issues or a specific quality issue. Data from wwPDB Validation Report, obtained via EMDB.',
        legend: TableLegend(ValidationColorTable)
    };
}

export const QscoreThemeProvider: ColorTheme.Provider<Params, 'emdb-qscore-report'> = {
    name: 'emdb-qscore-report',
    label: 'Q-score Report',
    category: ColorTheme.Category.Validation,
    factory: StructureQualityReportColorTheme,
    getParams: ctx => {
        return {
            type: PD.Text('qscore', { isHidden: true })
        };
    },
    defaultValues: PD.getDefaultValues(StructureQualityReportColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) => EMQualityReport.isApplicable(ctx.structure?.models[0]),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) => {
            EMQualityReportProvider.defaultParams.metric = PD.Text('qscore', { description: 'Q-score' });
            if (data.structure) {
                return EMQualityReportProvider.attach(ctx, data.structure.models[0], { 'metric': 'qscore' }, true);
            } else {
                return Promise.resolve();
            }
        },
        detach: (data) => {
            if (data.structure) {
                return EMQualityReportProvider.ref(data.structure.models[0], false);
            } else {
                return Promise.resolve();
            }
        }
    }
};

export const AtomInclusionThemeProvider: ColorTheme.Provider<Params, 'emdb-ai-report'> = {
    name: 'emdb-ai-report',
    label: 'Atom inclusion Report',
    category: ColorTheme.Category.Validation,
    factory: StructureQualityReportColorTheme,
    getParams: ctx => {
        return {
            type: PD.Text('ai', { isHidden: true })
        };
    },
    defaultValues: PD.getDefaultValues(StructureQualityReportColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) => EMQualityReport.isApplicable(ctx.structure?.models[0]),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) => {
            EMQualityReportProvider.defaultParams.metric = PD.Text('ai', { description: 'Atom inclusion' });
            if (data.structure) {
                return EMQualityReportProvider.attach(ctx, data.structure.models[0], { 'metric': 'ai' }, true);
            } else {
                return Promise.resolve();
            }
        },
        detach: (data) => {
            if (data.structure) {
                return EMQualityReportProvider.ref(data.structure.models[0], false);
            } else {
                return Promise.resolve();
            }
        }
    }
};