/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import {Model, ResidueIndex, Unit, IndexedCustomProperty, CifExportContext} from 'Molstar/mol-model/structure';
import { StructureElement } from 'Molstar/mol-model/structure/structure';
import { ParamDefinition as PD } from 'Molstar/mol-util/param-definition';
import { PropertyWrapper } from 'Molstar/mol-model-props/common/wrapper';
import { CustomProperty } from 'Molstar/mol-model-props/common/custom-property';
import { CustomModelProperty } from 'Molstar/mol-model-props/common/custom-model-property';
import { Asset } from 'Molstar/mol-util/assets';
import { CustomPropertyDescriptor } from 'Molstar/mol-model/custom-property';

export { EMQualityReport };

interface EMScore {
    type: string,
    chain: string,
    position: number,
    residue: string,
    score: number,
    color: string
}

type EMQualityReport = PropertyWrapper<{
    score: IndexedCustomProperty.Residue<EMScore>
} | undefined>

namespace EMQualityReport {
    export const DefaultServerUrl = 'https://www.ebi.ac.uk/emdb/api/analysis/model/scores';
    export function getEntryUrl(pdbId: string, serverUrl: string) {
        const metric = EMQualityReportParams.metric.defaultValue;
        return `${serverUrl}/${pdbId.toLowerCase()}?metric=${metric}`;
    }

    export function isApplicable(model?: Model): boolean {
        return !!model && Model.hasPdbId(model);
    }

    export function fromJson(model: Model, data: any) {
        const info = PropertyWrapper.createInfo();
        const scoreMap = createScoreMapFromJson(model, data);
        return { info, data: scoreMap };
    }

    export async function fromServer(ctx: CustomProperty.Context, model: Model, props: EMQualityReportProps): Promise<CustomProperty.Data<EMQualityReport>> {
        const url = Asset.getUrlAsset(ctx.assetManager, getEntryUrl(model.entryId, props.serverUrl));
        const json = await ctx.assetManager.resolve(url, 'json').runInContext(ctx.runtime);
        const data = json.data;
        // Get data from API endpoint. Parse the first key [pdb_id]
        if (!data) throw new Error('missing data');
        return { value: fromJson(model, data), assets: [json] };
    }

    export function getScores(e: StructureElement.Location) {
        if (!Unit.isAtomic(e.unit)) return null;
        const prop = EMQualityReportProvider.get(e.unit.model).value;
        if (!prop || !prop.data) return null;
        const rI = e.unit.residueIndex[e.element];
        // @ts-ignore
        return prop.data.score.has(rI) ? prop.data.score.get(rI)! : null;
    }
}

export let EMQualityReportParams = {
    serverUrl: PD.Text(EMQualityReport.DefaultServerUrl, { description: 'JSON API Server URL' }),
    metric: PD.Text('qscore', { description: 'Metric to use for coloring' })
};
export type EMQualityReportParams = typeof EMQualityReportParams
export type EMQualityReportProps = PD.Values<EMQualityReportParams>

export const EMQualityReportProvider: CustomModelProperty.Provider<EMQualityReportParams, EMQualityReport> = CustomModelProperty.createProvider({
    label: 'Structure Quality Report',
    descriptor: CustomPropertyDescriptor<CifExportContext, any>({
        name: 'emdb_structure_quality_report',
    }),
    type: 'static',
    defaultParams: EMQualityReportParams,
    getParams: (data: Model) => EMQualityReportParams,
    isApplicable: (data: Model) => EMQualityReport.isApplicable(data),
    obtain: async (ctx: CustomProperty.Context, data: Model, props: Partial<EMQualityReportProps>) => {
        const p = { ...PD.getDefaultValues(EMQualityReportParams), ...props };
        return await EMQualityReport.fromServer(ctx, data, p);
    }
});

function getAsymIdFromChainId(modelData: Model, chainId: string): string|undefined {
    const chains = modelData.atomicHierarchy.chains.auth_asym_id.__array;

    if (chains) {
        for (let i = 0; i < chains.length; i++) {
            if (chains[i] === chainId) {
                return modelData.atomicHierarchy.chains.label_asym_id.value(i);
            }
        }
    }
    return undefined;

}

function createScoreMapFromJson(modelData: Model, data: any): EMQualityReport['data'] | undefined {
    const scores = new Map<ResidueIndex, EMScore>();

    for (const emdbId in data) {
        for (const annotation of data[emdbId] as EMScore[]) {
            const asymId = getAsymIdFromChainId(modelData, annotation.chain);
            if (!asymId) continue;
            const entityId = modelData.atomicHierarchy.index.findEntity(asymId) + 1;
            const authSeqId = Math.floor(annotation.position);
            const idx = modelData.atomicHierarchy.index.findResidue(entityId.toString(), asymId, authSeqId);
            if (idx !== -1) {
                scores.set(idx, annotation);
            }
        }
    }

    return {
        score: IndexedCustomProperty.fromResidueMap(scores)
    };
}
