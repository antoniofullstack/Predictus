import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RegistrationService } from './registration.service';
import {
  CreateRegistrationDto,
  VerifyMfaDto,
  UpdateDocumentDto,
  UpdateContactDto,
  UpdateAddressDto,
} from './dto';

@Controller('registrations')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  create(@Body() dto: CreateRegistrationDto) {
    return this.registrationService.create(dto);
  }

  @Post(':id/verify-mfa')
  verifyMfa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyMfaDto,
  ) {
    return this.registrationService.verifyMfa(id, dto);
  }

  @Patch(':id/step/document')
  updateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.registrationService.updateDocument(id, dto);
  }

  @Patch(':id/step/contact')
  updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.registrationService.updateContact(id, dto);
  }

  @Patch(':id/step/address')
  updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.registrationService.updateAddress(id, dto);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.registrationService.complete(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.registrationService.findOne(id);
  }
}
