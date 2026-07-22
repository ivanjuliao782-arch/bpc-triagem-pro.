import { initAuthCreds, BufferJSON, AuthenticationState } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const useSupabaseAuthState = async (sessionName: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
    const { data: credsData } = await supabase.from('baileys_auth').select('data').eq('id', `${sessionName}_creds`).single();
    let creds = credsData ? JSON.parse(credsData.data, BufferJSON.reviver) : initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data: { [_: string]: any } = {}
                    for (const id of ids) {
                        const { data: keyData } = await supabase.from('baileys_auth').select('data').eq('id', `${sessionName}_${type}_${id}`).single();
                        if (keyData) {
                            data[id] = JSON.parse(keyData.data, BufferJSON.reviver);
                        }
                    }
                    return data
                },
                set: async (data) => {
                    for (const category in data) {
                        for (const id in data[category as keyof typeof data]) {
                            const value = data[category as keyof typeof data]![id]
                            const dbId = `${sessionName}_${category}_${id}`
                            
                            if (value) {
                                await supabase.from('baileys_auth').upsert({ id: dbId, data: JSON.stringify(value, BufferJSON.replacer) }, { onConflict: 'id' });
                            } else {
                                await supabase.from('baileys_auth').delete().eq('id', dbId);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: async () => {
            await supabase.from('baileys_auth').upsert({ id: `${sessionName}_creds`, data: JSON.stringify(creds, BufferJSON.replacer) }, { onConflict: 'id' });
        }
    }
}
