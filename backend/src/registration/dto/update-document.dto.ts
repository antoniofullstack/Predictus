import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DocumentType } from '../enums/document-type.enum';

export class UpdateDocumentDto {
  @IsEnum(DocumentType, { message: 'Tipo de documento inválido' })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  documentType: DocumentType;

  @IsString({ message: 'Documento deve ser um texto' })
  @IsNotEmpty({ message: 'Documento é obrigatório' })
  document: string;
}
