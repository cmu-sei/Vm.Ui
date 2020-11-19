export * from './file.service';
import { FileService } from './file.service';
export * from './vms.service';
import { VmsService } from './vms.service';
export * from './vsphere.service';
import { VsphereService } from './vsphere.service';
export const APIS = [FileService, VmsService, VsphereService];
