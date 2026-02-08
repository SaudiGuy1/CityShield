# Response Playbooks

Automated response actions using Ansible playbooks.

## Available Playbooks

### block_ip
**File**: `infrastructure/ansible/playbooks/block_ip.yml`
**Purpose**: Block malicious IP addresses
**Parameters**:
- `ip_address`: IP to block
- `alert_id`: Associated alert ID

**Action**: Simulates iptables rule addition to DROP packets from source IP.

### isolate_service
**File**: `infrastructure/ansible/playbooks/isolate_service.yml`
**Purpose**: Isolate compromised services
**Parameters**:
- `service`: Service name to isolate
- `alert_id`: Associated alert ID

**Action**: Simulates Docker network disconnect to quarantine service.

### revoke_token
**File**: `infrastructure/ansible/playbooks/revoke_token.yml`
**Purpose**: Revoke user authentication tokens
**Parameters**:
- `user`: User ID
- `alert_id`: Associated alert ID

**Action**: Simulates JWT token revocation.

## Playbook Mapping

Response actions are mapped to playbooks in `services/response_manager/playbooks_map.yml`.

## Testing Playbooks

```bash
# Test playbook manually
ansible-playbook -i infrastructure/ansible/inventory.ini \
  infrastructure/ansible/playbooks/block_ip.yml \
  --extra-vars "ip_address=192.168.100.50 alert_id=test-001"
```

## Production Considerations

Current playbooks simulate actions for safety. For production:

1. Replace simulated actions with real firewall/network commands
2. Add proper error handling and rollback procedures
3. Implement approval workflows for critical actions
4. Add audit logging for all response actions
