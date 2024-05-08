/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author David Sehnal <david.sehnal@gmail.com>
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import {Model, ResidueIndex, Unit, IndexedCustomProperty, CifExportContext} from 'Molstar/mol-model/structure';
import { StructureElement } from 'Molstar/mol-model/structure/structure';
import { ParamDefinition as PD } from 'Molstar/mol-util/param-definition';
import { arraySetAdd } from 'Molstar/mol-util/array';
import { PropertyWrapper } from 'Molstar/mol-model-props/common/wrapper';
import { CustomProperty } from 'Molstar/mol-model-props/common/custom-property';
import { CustomModelProperty } from 'Molstar/mol-model-props/common/custom-model-property';
import { Asset } from 'Molstar/mol-util/assets';
import { CustomPropertyDescriptor } from 'Molstar/mol-model/custom-property';

export { EMQualityReport };

interface EMScore {
    score: number,
    type: string,
    color: string
}

type EMQualityReport = PropertyWrapper<{
    issues: IndexedCustomProperty.Residue<string[]>,
    issueTypes: string[],
    score?: IndexedCustomProperty.Residue<EMScore>
} | undefined>

namespace EMQualityReport {
    // TODO #1: Replace DefaultServerUrl with the correct URL
    export const DefaultServerUrl = 'https://www.ebi.ac.uk/pdbe/api/validation/residuewise_outlier_summary/entry/';
    export function getEntryUrl(pdbId: string, serverUrl: string) {
        // TODO #2: Replace the return statement with the correct URL
        return `${serverUrl}/${pdbId.toLowerCase()}`;
    }

    export function isApplicable(model?: Model): boolean {
        return !!model && Model.hasPdbId(model);
    }

    export function fromJson(model: Model, data: any) {
        const info = PropertyWrapper.createInfo();
        // TODO #3: Replace createIssueMapFromJson with the correct function (Use apropriate naming)
        const issueMap = createIssueMapFromJson(model, data);
        return { info, data: issueMap };
    }

    export async function fromServer(ctx: CustomProperty.Context, model: Model, props: EMQualityReportProps): Promise<CustomProperty.Data<EMQualityReport>> {
        const url = Asset.getUrlAsset(ctx.assetManager, getEntryUrl(model.entryId, props.serverUrl));
        const json = await ctx.assetManager.resolve(url, 'json').runInContext(ctx.runtime);
        const data = json.data[model.entryId.toLowerCase()];
        // Get data from API endpoint. Parse the first key [pdb_id]
        if (!data) throw new Error('missing data');
        return { value: fromJson(model, data), assets: [json] };
    }

    const _emptyArray: string[] = [];
    const _emptyArray2: EMScore[] = [];
    // FIXME: This function will be replaced by getScores
    export function getIssues(e: StructureElement.Location) {
        if (!Unit.isAtomic(e.unit)) return _emptyArray;
        const prop = EMQualityReportProvider.get(e.unit.model).value;
        if (!prop || !prop.data) return _emptyArray;
        const rI = e.unit.residueIndex[e.element];
        return prop.data.issues.has(rI) ? prop.data.issues.get(rI)! : _emptyArray;
    }

    // TODO #4: Implement proper getScores function
    export function getScores(e: StructureElement.Location) {
        if (!Unit.isAtomic(e.unit)) return _emptyArray2;
        const prop = EMQualityReportProvider.get(e.unit.model).value;
        if (!prop || !prop.data) return _emptyArray2;
        const rI = e.unit.residueIndex[e.element];
        // @ts-ignore
        return prop.data.scores.has(rI) ? prop.data.scores.get(rI)! : _emptyArray2;
    }
}

export const EMQualityReportParams = {
    serverUrl: PD.Text(EMQualityReport.DefaultServerUrl, { description: 'JSON API Server URL' })
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


function createIssueMapFromJson(modelData: Model, data: any): EMQualityReport['data'] | undefined {
    const ret = new Map<ResidueIndex, string[]>();
    const scores = new Map<ResidueIndex, EMScore>();
    if (!data.molecules) return;

    const issueTypes: string[] = [];

    // This block iterates over the JSON obtained from the API endpoint and creates a map of residue indices to their respective outlier types (ret)
    for (const entity of data.molecules) {
        const entity_id = entity.entity_id.toString();
        for (const chain of entity.chains) {
            const asym_id = chain.struct_asym_id.toString();
            for (const model of chain.models) {
                const model_id = model.model_id.toString();
                if (+model_id !== modelData.modelNum) continue;

                for (const residue of model.residues) {
                    const auth_seq_id = residue.author_residue_number, ins_code = residue.author_insertion_code || '';
                    const idx = modelData.atomicHierarchy.index.findResidue(entity_id, asym_id, auth_seq_id, ins_code);
                    ret.set(idx, residue.outlier_types);

                    let score = 0;
                    let type = 'No Issues';
                    let color = 'black';


                    if ('sidechain_outliers' in residue.outlier_types) {
                        score = 4;
                        type = 'Sidechain Outliers';
                        color = '#00FF00';
                    } else if ('ramachandran_outliers' in residue.outlier_types) {
                        score = 3;
                        type = 'Bond Lengths';
                        color = '#EADDCA';
                    } else if ('bond_angles' in residue.outlier_types) {
                        score = 2;
                        type = 'Bond Angles';
                        color = '#FFA500';
                    } else if ('clashes' in residue.outlier_types) {
                        score = 1;
                        type = 'Clashes';
                        color = '#AA4A44';
                    } else {
                        score = 0;
                        type = 'No Issues';
                        color = '#0000FF';
                    }

                    scores.set(idx, { score, type, color });


                    for (const t of residue.outlier_types) {
                        arraySetAdd(issueTypes, t);
                    }
                }
            }
        }
    }

    return {
        issues: IndexedCustomProperty.fromResidueMap(ret),
        // @ts-ignore
        scores: IndexedCustomProperty.fromResidueMap(scores),
        issueTypes
    };
}
