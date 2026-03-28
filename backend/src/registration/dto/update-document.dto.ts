import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';

export class UpdateDocumentDto {
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  @IsString()
  @IsNotEmpty()
  document: string;
}
