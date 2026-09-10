import { supabase } from './supabase';

export type AccountAppeal = {
  id: string;
  account_status: 'suspended' | 'banned';
  reason: string;
  details: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  resolution_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportTicket = {
  id: string;
  number: number;
  subject: string;
  category: string;
  priority: string;
  status: 'new' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  resolved_at: string | null;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  author_type: 'user' | 'admin';
  body: string;
  created_at: string;
};

function rows<T>(value: unknown): T[] { return (Array.isArray(value) ? value : []) as T[]; }

export const trustSafety = {
  async submitAppeal(reason: string, details: string): Promise<string> {
    const { data, error } = await supabase.rpc('submit_my_appeal_v1', { p_reason: reason, p_details: details });
    if (error) throw error;
    return String(data);
  },
  async getAppeals(): Promise<AccountAppeal[]> {
    const { data, error } = await supabase.rpc('get_my_appeals_v1');
    if (error) throw error;
    return rows<AccountAppeal>(data);
  },
  async createTicket(subject: string, category: string, body: string): Promise<{ticket_id:string;ticket_number:number}> {
    const { data, error } = await supabase.rpc('create_my_support_ticket_v1', { p_subject: subject, p_category: category, p_body: body });
    if (error) throw error;
    const row = rows<any>(data)[0];
    if (!row?.ticket_id) throw new Error('support_ticket_not_created');
    return { ticket_id: String(row.ticket_id), ticket_number: Number(row.ticket_number) };
  },
  async getTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase.rpc('get_my_support_tickets_v1');
    if (error) throw error;
    return rows<SupportTicket>(data);
  },
  async getMessages(ticketId: string): Promise<SupportMessage[]> {
    const { data, error } = await supabase.rpc('get_my_support_messages_v1', { p_ticket_id: ticketId });
    if (error) throw error;
    return rows<SupportMessage>(data);
  },
  async sendMessage(ticketId: string, body: string): Promise<string> {
    const { data, error } = await supabase.rpc('send_my_support_message_v1', { p_ticket_id: ticketId, p_body: body });
    if (error) throw error;
    return String(data);
  },
  subscribe(userId: string, onChange: () => void) {
    const channel = supabase.channel(`trust-safety:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pg_support_tickets', filter: `requester_id=eq.${userId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pg_support_messages' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'account_appeals', filter: `user_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};
