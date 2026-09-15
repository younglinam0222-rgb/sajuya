export type RefundStatus = 'review' | 'queued' | 'processing' | 'uncertain' | 'blocked' | 'succeeded' | 'rejected'
export interface RefundRecord {
 id:string; order_id:string; user_id?:string; kind:string; reason:string; status:RefundStatus;
 amount:number; coins:number; review_reason:string|null; decision_note:string|null; created_at:string;
}
export interface RefundOrder {
 order_id:string; product:string; amount:number; coins:number; available:number; refunded_amount:number;
 tracked:boolean; created_at:string; jobs:{id:string; product:string; status:string}[];
}
export interface RefundData { orders:RefundOrder[]; refunds:RefundRecord[]; admin?:boolean; enabled?:boolean }
export const STATUS:Record<RefundStatus,string>={review:'검토 필요',queued:'취소 준비',processing:'취소 처리 중',uncertain:'결제 결과 확인 중',blocked:'처리 확인 필요',succeeded:'취소 완료',rejected:'검토 답변 완료'}
export const CUSTOMER_STATUS:Record<RefundStatus,string>={...STATUS,review:'담당자 검토 중',blocked:'결제 취소 확인 중',uncertain:'결제 취소 확인 중'}
export const WON=(n:number)=>new Intl.NumberFormat('ko-KR').format(n)+'원'
