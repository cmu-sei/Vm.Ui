/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

/**
 * Player API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


export interface ApplicationTemplate { 
    id?: string;
    /**
     * The location of the application. {teamId}, {teamName}, {viewId} and {viewName} will be replaced dynamically if included
     */
    name?: string | null;
    /**
     * The location of the application. {teamId}, {teamName}, {viewId} and {viewName} will be replaced dynamically if included
     */
    url?: string | null;
    icon?: string | null;
    embeddable?: boolean;
    loadInBackground?: boolean;
}

