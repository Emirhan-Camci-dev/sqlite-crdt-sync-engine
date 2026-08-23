// Copyright (c) 2026 Emirhan CAMCI. All rights reserved.

use wasm_bindgen::prelude::*;
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::{Deserialize, Serialize};

// The public key corresponding to your private key on Polar.sh
// In a real scenario, this would be baked in or fetched securely if online,
// but for offline verification, embedding the public key is standard.
const POLAR_PUBLIC_KEY_HEX: &str = "YOUR_PUBLIC_KEY_HEX"; 

#[derive(Serialize, Deserialize)]
pub struct LicensePayload {
    pub seat_id: String,
    pub expires_at: u64,
    pub features: Vec<String>,
}

#[wasm_bindgen]
pub fn verify_license(payload_json: &str, signature_hex: &str) -> bool {
    let public_key_bytes = match hex::decode(POLAR_PUBLIC_KEY_HEX) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };
    
    let public_key = match PublicKey::from_bytes(&public_key_bytes) {
        Ok(pk) => pk,
        Err(_) => return false,
    };

    let signature_bytes = match hex::decode(signature_hex) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    let signature = match Signature::from_bytes(&signature_bytes) {
        Ok(sig) => sig,
        Err(_) => return false,
    };

    // Verify the signature against the raw payload string
    public_key.verify(payload_json.as_bytes(), &signature).is_ok()
}
