/**
 * Player VM API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * OpenAPI spec version: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { IsoFile } from './isoFile';
import { TeamIsoResult } from './teamIsoResult';


export interface IsoResult { 
    viewId?: string;
    viewName?: string;
    isos?: Array<IsoFile>;
    teamIsoResults?: Array<TeamIsoResult>;
}
