/**
 * Player VM API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { CoordinateCreateForm } from './coordinateCreateForm';


export interface VmMapCreateForm { 
    coordinates?: Array<CoordinateCreateForm> | null;
    name?: string | null;
    imageUrl?: string | null;
    teamIds?: Array<string> | null;
}

