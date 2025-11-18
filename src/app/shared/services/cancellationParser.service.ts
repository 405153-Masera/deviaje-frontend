import { Injectable } from '@angular/core';
import { CancellationRulesDto } from '../../features/client/models/bookings';

@Injectable({
  providedIn: 'root'
})
export class CancellationParserService {

  /**
   * Parsea las reglas de cancelación desde el objeto de Amadeus
   * @param verifiedOffer Oferta verificada con include=detailed-fare-rules
   * @returns CancellationRulesDto con la información parseada
   */
  parseCancellationRules(verifiedOffer: any): CancellationRulesDto | null {
    try {
      // Extraer detailed-fare-rules del included
      const included = verifiedOffer?.included?.['detailed-fare-rules'];
      
      if (!included) {
        console.warn('No se encontraron detailed-fare-rules en la oferta');
        return null;
      }

      // Obtener el primer segmento con penalidades (normalmente segmentId "1")
      const firstRule = Object.values(included)[0] as any;
      
      if (!firstRule?.fareNotes?.descriptions) {
        return null;
      }

      // Buscar la descripción de PENALTIES
      const penaltiesDesc = firstRule.fareNotes.descriptions.find(
        (desc: any) => desc.descriptionType === 'PENALTIES'
      );

      if (!penaltiesDesc?.text) {
        return null;
      }

      const penaltiesText = penaltiesDesc.text.toUpperCase();
      
      // Obtener la fecha de salida del vuelo (deadline)
      const deadline = this.extractDepartureDate(verifiedOffer);

      // Parsear la política
      return this.parsePenaltyText(penaltiesText, deadline);

    } catch (error) {
      console.error('Error parseando reglas de cancelación:', error);
      return null;
    }
  }

  /**
   * Parsea el texto de penalidades y extrae la información estructurada
   */
  private parsePenaltyText(txt: string, deadline: string | null): CancellationRulesDto {
    let cancellationPolicy: CancellationRulesDto['cancellationPolicy'] = 'UNKNOWN';
    let penaltyAmount: number | undefined;
    let penaltyCurrency: string | undefined;

    // 1. NO REEMBOLSABLE
    if (txt.includes('NON-REFUNDABLE') || txt.includes('NOT PERMITTED')) {
      cancellationPolicy = 'NON_REFUNDABLE';
    }
    // 2. REEMBOLSABLE SIN PENALIDAD
    else if (txt.includes('REFUND') && (txt.includes('NO CHARGE') || txt.includes('FREE'))) {
      cancellationPolicy = 'REFUNDABLE';
    }
    // 3. REEMBOLSABLE CON PENALIDAD
    else if (txt.includes('REFUND') || txt.includes('CANCELLATION')) {
      cancellationPolicy = 'REFUNDABLE_WITH_PENALTY';
      
      // Buscar patrón: CHARGE USD 125.00 o CHARGE 125.00 USD
      const chargePattern = /CHARGE\s+([A-Z]{3})\s*([0-9]+(?:\.[0-9]+)?)/;
      const match = txt.match(chargePattern);
      
      if (match) {
        penaltyCurrency = match[1];
        penaltyAmount = parseFloat(match[2]);
      }
    }

    return {
      cancellationPolicy,
      penaltyAmount,
      penaltyCurrency,
      deadline: deadline || undefined,
      rawText: txt.substring(0, 500) // Guardar primeros 500 chars para referencia
    };
  }

  /**
   * Extrae la fecha de salida del primer vuelo
   */
  private extractDepartureDate(offer: any): string | null {
    try {
      const firstSegment = offer?.itineraries?.[0]?.segments?.[0];
      return firstSegment?.departure?.at || null;
    } catch {
      return null;
    }
  }
}