/**
 * Service for Dataverse annotation (notes) entity.
 * Annotations are system entities used for notes, attachments, and timeline items.
 */
import type { IGetAllOptions } from '../models/CommonModels';
import type { IOperationResult } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '../../../.power/schemas/appschemas/dataSourcesInfo';
import { getClient } from '@microsoft/power-apps/data';

export interface AnnotationRecord {
  annotationid?: string;
  subject?: string;
  notetext?: string;
  createdon?: string;
  modifiedon?: string;
  _objectid_value?: string;
  objecttypecode?: string;
  isdocument?: boolean;
  filename?: string;
  filesize?: number;
  mimetype?: string;
  _createdby_value?: string;
  _modifiedby_value?: string;
  /** Base64-encoded file content for document attachments */
  documentbody?: string;
}

export class AnnotationsService {
  private static readonly dataSourceName = 'annotations';
  private static readonly client = getClient(dataSourcesInfo);

  public static async getAll(options?: IGetAllOptions): Promise<IOperationResult<AnnotationRecord[]>> {
    const result = await AnnotationsService.client.retrieveMultipleRecordsAsync<AnnotationRecord>(
      AnnotationsService.dataSourceName,
      options
    );
    return result;
  }

  public static async create(record: Partial<AnnotationRecord>): Promise<IOperationResult<AnnotationRecord>> {
    const result = await AnnotationsService.client.createRecordAsync<Partial<AnnotationRecord>, AnnotationRecord>(
      AnnotationsService.dataSourceName,
      record
    );
    return result;
  }

  public static async update(id: string, changes: Partial<AnnotationRecord>): Promise<IOperationResult<AnnotationRecord>> {
    const result = await AnnotationsService.client.updateRecordAsync<Partial<AnnotationRecord>, AnnotationRecord>(
      AnnotationsService.dataSourceName,
      id,
      changes
    );
    return result;
  }

  public static async delete(id: string): Promise<void> {
    await AnnotationsService.client.deleteRecordAsync(
      AnnotationsService.dataSourceName,
      id
    );
  }
}
