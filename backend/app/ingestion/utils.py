# Utility functions for email ingestion

import re
from email.header import decode_header

def decode_email_subject(subject):
    if not subject:
        return ""
    decoded_list = decode_header(subject)
    subject_str = ""
    for text, encoding in decoded_list:
        if isinstance(text, bytes):
            try:
                subject_str += text.decode(encoding or 'utf-8', errors='replace')
            except Exception:
                subject_str += text.decode('utf-8', errors='replace')
        else:
            subject_str += text
    return subject_str

def extract_email_from_sender(sender_string):
    if not sender_string:
        return None
    match = re.search(r'<([^>]+)>', sender_string)
    if match:
        return match.group(1).strip()
    return sender_string.strip()

def extract_branch_name_from_text(text):
    if not text:
        return None
    patterns = [
        r'^([^:]+?):',
        r'^([^-]+?)-',
        r'^([^|]+?)\|',
    ]
    for pattern in patterns:
        match = re.match(pattern, text)
        if match:
            return match.group(1).strip()
    words = text.strip().split()
    if len(words) >= 2:
        return ' '.join(words[:3])
    return None
