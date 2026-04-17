# CityShield — Role Workflow Diagrams

---

## 1. Researcher Workflow

```
                                 ┌───────────────────┐
                                 │      LOGIN        │
                                 │   /login          │
                                 └─────────┬─────────┘
                                           │
                                           ▼
                                 ┌───────────────────┐
                                 │    DASHBOARD      │
                                 │  Review stats,    │
                                 │  system status    │
                                 └─────────┬─────────┘
                                           │
                                           ▼
                  ┌──────────────────────────────────────────────────┐
                  │              CHOOSE RESEARCH PATH                │
                  └──┬─────────┬─────────┬──────────┬────────────┬───┘
                     │         │         │          │            │
                     ▼         ▼         ▼          ▼            ▼
                ┌────────┐┌────────┐┌─────────┐┌─────────┐┌──────────┐
                │Built-in││ Custom ││Research ││Proposal ││  Rules   │
                │Scenario││Scenario││  Lab    ││ Submit  ││ Manage   │
                └───┬────┘└───┬────┘└────┬────┘└────┬────┘└────┬─────┘
                    │         │          │          │          │
                    ▼         ▼          ▼          ▼          ▼



  ── PATH A: Built-in Scenario ─────────────────────────────────────

  ┌───────────────────┐
  │  /scenarios       │
  │  Attack Scenarios │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐     ┌───────────────────┐
  │  Quick Launch     │     │  Browse Scenario  │
  │  DDoS / Scan /    │ OR  │  Cards            │
  │  Brute / Malware  │     │  Click Run&Watch  │
  └─────────┬─────────┘     └─────────┬─────────┘
            │                         │
            └────────────┬────────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Target Selection │
               │  Random or pick   │
               │  specific device  │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Scenario Running │
               │  pending →        │
               │  running →        │
               │  completed        │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  View Analysis    │
               │  Detection rate,  │
               │  timing, matches  │
               └───────────────────┘



  ── PATH B: Custom Scenario Builder ───────────────────────────────

  ┌───────────────────┐
  │ /scenarios/custom │
  │ Fill name, target,│
  │ description       │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Select MITRE      │
  │ ATT&CK Techniques │
  │ Search + select   │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Configure Params  │
  │ threshold,        │
  │ intensity, types  │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Add to Attack     │
  │ Chain             │
  │ Reorder phases    │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Execute Attack    │
  │ Scenario          │
  │ Real traffic      │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Results Banner    │
  │ Run ID shown      │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ View Attack       │
  │ Effectiveness     │
  │ Analysis          │
  └───────────────────┘



  ── PATH C: Research Lab ──────────────────────────────────────────

  ┌───────────────────┐
  │ /scenarios        │
  │ Tab: Research Lab │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Click Launch Lab  │
  │ Ubuntu container  │
  │ provisioned       │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Web Terminal      │
  │ nmap, hydra,      │
  │ nikto, curl, nc   │
  └─────────┬─────────┘
            │
       ┌────┴────┐
       │         │
       ▼         ▼
  ┌─────────┐ ┌─────────┐
  │Metasploi│ │IoT Hub  │
  │table    │ │172.21.  │
  │172.20.  │ │0.2      │
  │0.2      │ │:8080    │
  └────┬────┘ └────┬────┘
       │           │
       └─────┬─────┘
             │
             ▼
  ┌───────────────────┐
  │ Switch to /alerts │
  │ Observe generated │
  │ detection alerts  │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Destroy Lab       │
  │ when finished     │
  └───────────────────┘



  ── PATH D: Attack Proposal ───────────────────────────────────────

  ┌───────────────────┐
  │ /proposals        │
  │ + Submit Proposal │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Fill Form         │
  │ Title, techniques,│
  │ target, duration  │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Status: Pending   │
  │ Wait for Admin    │
  └─────────┬─────────┘
            │
       ┌────┴────┐
       │         │
       ▼         ▼
  ┌─────────┐ ┌─────────┐
  │Approved │ │Rejected │
  │Scenario │ │Read     │
  │created  │ │feedback │
  │→ Run it │ │→ Revise │
  └─────────┘ └─────────┘



  ── PATH E: Rule Management ───────────────────────────────────────

  ┌───────────────────┐
  │ /rules            │
  │ Filter by severity│
  │ and status        │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Click Details     │
  │ View MITRE map,   │
  │ actions, sources  │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Configure Auto-   │
  │ Response          │
  │ Enable, severity, │
  │ rate limit        │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Save Settings     │
  └─────────┬─────────┘
            │
            ▼
  ┌───────────────────┐
  │ Run Scenario →    │
  │ Check Alerts →    │
  │ Verify Auto-      │
  │ Response Fired    │
  └───────────────────┘
```


---

## 2. Analyst Workflow

```
               ┌───────────────────┐
               │      LOGIN        │
               │   /login          │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │    DASHBOARD      │
               │  Check events,    │
               │  alerts, status   │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  3D SMART CITY    │
               │  /city            │
               │  Scan for red     │
               │  buildings        │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  ALERTS PAGE      │
               │  /alerts          │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Filter Alerts    │
               │  Status: Open     │
               │  Severity: Crit.  │
               │  Search / Sort    │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Click Alert      │
               │  to Expand        │
               └─────────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │  ANALYSIS   ││  ACTIONS    ││  RELATED    │
   │  TAB        ││  TAB        ││  EVENTS TAB │
   │             ││             ││             │
   │ MITRE info  ││ block_ip    ││ Raw event   │
   │ What/Why/   ││ isolate_    ││ timeline    │
   │ How to fix  ││ service     ││ src → dst   │
   │ Enrichment  ││ revoke_     ││ Cross-ref   │
   │ Indicators  ││ token       ││ by IP       │
   └──────┬──────┘└──────┬──────┘└─────────────┘
          │              │
          │  Classify:   │
          │  True Pos. ──┘
          │  False Pos. → Resolve
          │
          ▼
   ┌───────────────────┐
   │  Click Execute    │
   │  on action card   │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  Confirmation     │
   │  Dialog           │
   │  ☑ Acknowledge    │
   │  risk → Confirm   │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  Monitor          │
   │  Execution        │
   │  pending →        │
   │  success / failed │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  View Execution   │
   │  Details Modal    │
   │  stdout / stderr  │
   │  playbook output  │
   └─────────┬─────────┘
             │
        ┌────┴────┐
        │         │
        ▼         ▼
   ┌─────────┐ ┌─────────┐
   │ SUCCESS │ │ FAILED  │
   └────┬────┘ └────┬────┘
        │           │
        │           ▼
        │    ┌─────────────┐
        │    │ Retry or    │
        │    │ Escalate    │
        │    └─────────────┘
        │
        ▼
   ┌───────────────────┐
   │  Update Status    │
   │  Open → Triaged   │
   │  → Resolved       │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  Verify Closure   │
   │  View on Map      │
   │  View Device      │
   │  Review Audit Log │
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │  Next Alert       │
   │  Continue triage  │
   │  cycle            │
   └───────────────────┘
```

---

## 3. Admin Workflow

```
                                ┌───────────────────┐
                                │      LOGIN        │
                                │   /login          │
                                └─────────┬─────────┘
                                          │
                                          ▼
                                ┌───────────────────┐
                                │    DASHBOARD      │
                                │ Full health check │
                                │  Stats + 3D Map   │
                                │  System status    │
                                └─────────┬─────────┘
                                          │
                                          ▼
                    ┌────────────────────────────────────────┐
                    │            ADMIN TASKS                 │
                    └──┬──────┬──────┬──────┬──────┬──────┬──┘
                       │      │      │      │      │      │
                       ▼      ▼      ▼      ▼      ▼      ▼



  ── TASK 1: User Management ───────────────────────────────────────

               ┌───────────────────┐
               │  /admin/users     │
               └─────────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │ Create User ││ Enable /    ││ Delete User │
   │             ││ Disable     ││             │
   │ Username    ││ User        ││ Confirm     │
   │ Email       ││             ││ dialog      │
   │ Password    ││             ││             │
   │ Role        ││             ││             │
   └─────────────┘└─────────────┘└─────────────┘



  ── TASK 2: Device Management ─────────────────────────────────────

               ┌───────────────────┐
               │  /devices         │
               │  Filter by zone,  │
               │  type, status     │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Click Device Row │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Device Detail    │
               │  Panel            │
               │  Metrics, chart,  │
               │  related alerts   │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Enable / Disable │
               │  View Logs        │
               └───────────────────┘



  ── TASK 3: Proposal Review ───────────────────────────────────────

               ┌───────────────────┐
               │  /proposals       │
               │  Filter: Pending  │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Click Review     │
               │  on proposal      │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Read Full        │
               │  Proposal         │
               │  Techniques,      │
               │  target, risk     │
               └─────────┬─────────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
              ┌──────────┐ ┌──────────┐
              │ Approve  │ │ Reject   │
              │ Scenario │ │ Write    │
              │ created  │ │ feedback │
              └──────────┘ └──────────┘



  ── TASK 4: Rule Oversight ────────────────────────────────────────

               ┌───────────────────┐
               │  /rules           │
               │  Browse 25 rules  │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Toggle Rules     │
               │  Enable / Disable │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Click Details    │
               │  View rule info   │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Review Auto-     │
               │  Response Config  │
               │  Verify settings  │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Check Execution  │
               │  History Table    │
               └───────────────────┘



  ── TASK 5: Monitoring & Metrics ──────────────────────────────────

               ┌───────────────────┐
               │  Dashboard /      │
               │  System Status    │
               │  ● All services   │
               └─────────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │ OpenSearch  ││ Metrics     ││ Audit Log   │
   │ Dashboards  ││             ││             │
   │ :5601       ││ MTTD        ││ All actions │
   │ Custom      ││ MTTR        ││ manual +    │
   │ queries     ││ Accuracy    ││ automated   │
   │             ││ Success %   ││ Filter by   │
   │             ││             ││ date, rule  │
   └─────────────┘└─────────────┘└─────────────┘



  ── TASK 6: Security Awareness ────────────────────────────────────

               ┌───────────────────┐
               │  /awareness       │
               └─────────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │ Employee    ││ Executive   ││ IT/Security │
   │ Training    ││ Training    ││ Training    │
   │             ││             ││             │
   │ 4 modules   ││ 4 modules   ││ 4 modules   │
   │ Scenarios   ││ Scenarios   ││ Scenarios   │
   │ Quiz: 70%   ││ Quiz: 75%   ││ Quiz: 80%   │
   └─────────────┘└─────────────┘└─────────────┘
```


---

## 4. Viewer Workflow

```
               ┌───────────────────┐
               │      LOGIN        │
               │   /login          │
               │                   │
               │  Enter credentials│
               │  (Viewer account) │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │   AUTO-REDIRECT   │
               │                   │
               │  Viewer role has  │
               │  no dashboard     │
               │  access — sent    │
               │  straight to      │
               │  /awareness       │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  SECURITY         │
               │  AWARENESS PAGE   │
               │  /awareness       │
               │                   │
               │  Only page visible│
               │  in sidebar       │
               └─────────┬─────────┘
                         │
                         ▼
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │ Employee    ││ Executive   ││ IT/Security │
   │ Training    ││ Training    ││ Training    │
   │ Program     ││ Program     ││ Program     │
   └──────┬──────┘└──────┬──────┘└──────┬──────┘
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │ 4 Training  ││ 4 Training  ││ 4 Training  │
   │ Modules     ││ Modules     ││ Modules     │
   │             ││             ││             │
   │ • Phishing  ││ • Cyber     ││ • Incident  │
   │ • Password  ││   Risk      ││   Response  │
   │ • Social    ││ • Data      ││ • Network   │
   │   Eng.      ││   Privacy   ││   Security  │
   │ • Data      ││ • Incident  ││ • Vuln.     │
   │   Handling  ││   Response  ││   Mgmt      │
   │ • Device    ││ • Vendor    ││ • Threat    │
   │   Security  ││   Security  ││   Hunting   │
   └──────┬──────┘└──────┬──────┘└──────┬──────┘
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │ Practice    ││ Practice    ││ Practice    │
   │ Scenarios   ││ Scenarios   ││ Scenarios   │
   │             ││             ││             │
   │ Interactive ││ Interactive ││ Interactive │
   │ real-world  ││ real-world  ││ real-world  │
   │ simulations ││ simulations ││ simulations │
   └──────┬──────┘└──────┬──────┘└──────┬──────┘
          │              │              │
          ▼              ▼              ▼
   ┌─────────────┐┌─────────────┐┌─────────────┐
   │ Quiz        ││ Quiz        ││ Quiz        │
   │ Pass: 70%   ││ Pass: 75%   ││ Pass: 80%   │
   └──────┬──────┘└──────┬──────┘└──────┬──────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  COMPLETION       │
               │                   │
               │  Review results,  │
               │  retake if needed │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  LOGOUT           │
               │                   │
               │  Sidebar logout   │
               │  button           │
               └───────────────────┘
```