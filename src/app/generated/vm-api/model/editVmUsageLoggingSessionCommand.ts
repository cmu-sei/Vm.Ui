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


export interface EditVmUsageLoggingSessionCommand { 
    /**
     * Data for a VmUsageLoggingSession.
     */
    id?: string;
    teamIds?: Array<string> | null;
    sessionName?: string | null;
    sessionStart?: string;
    sessionEnd?: string;
}

