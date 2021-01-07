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
import { Permission } from './permission';


export interface User { 
    id?: string;
    name?: string | null;
    roleId?: string | null;
    roleName?: string | null;
    permissions?: Array<Permission> | null;
    isSystemAdmin?: boolean;
}
