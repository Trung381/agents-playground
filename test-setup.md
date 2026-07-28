- example api call:
- customizable variable: "agent_code" (add another html input for it)
```
curl --request POST \
  --url https://pbx.voxa.vn/api/conversations/web-sessions \
  --header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRlbmFudElkIjoxLCJ1c2VybmFtZSI6InRydW5ndnUiLCJ0ZW5hbnRJc1Jvb3QiOnRydWUsImlzU3VwZXJBZG1pbiI6dHJ1ZSwidXNlckxldmVsIjoiU1VQRVJfQURNSU4iLCJwcmVmZXJyZWRMYW5ndWFnZSI6InZpIiwiZXhwIjoxNzg1MjU2NTMzfQ.-vbO9MOBV9JQkfOveD2peK3zPlm_L5OXkc7L8aTBnwE' \
  --header 'content-type: application/json' \
  --data '{
  "tenant_id": 1,
  "agent_code": "hang-khong",
  "channel": "web",
  "external_ref": "manual-web-test",
  "external_user_id": "test-user-001",
  "caller_identity": "web-user-001",
  "metadata": {
    "test": true,
    "source": "manual-curl"
  },
  "customer": {
    "name": "Anh Trung",
    "phone": "0364757669"
  }
}'
```

expected response: 
- variable to save/import: "access_token"
- this "access_token" goes to the html input: ```<textarea class="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-2" placeholder="room token..."></textarea>```
```
{
  "conversation": {
    "id": 143,
    "conversationId": "conv-78311146-8612-4822-b5ee-7e01e769f622",
    "tenantId": 1,
    "botId": 14,
    "agentId": 60,
    "agent": {
      "id": 60,
      "code": "gas-nang-luong",
      "name": "gas-nang-luong",
      "direction": "inbound"
    },
    "knowledgeBot": {
      "id": 14,
      "code": "english-restaurant-reservation",
      "name": "English Restaurant Reservation"
    },
    "channel": "web",
    "transport": "livekit_web",
    "direction": "inbound",
    "externalRef": "manual-web-test",
    "callerIdentity": "web-user-001",
    "calleeIdentity": "english-restaurant-reservation",
    "status": "active",
    "startedAt": "2026-07-28T15:25:01.000Z",
    "endedAt": null,
    "metadata": {
      "test": true,
      "agent": {
        "id": 60,
        "code": "gas-nang-luong",
        "name": "gas-nang-luong",
        "direction": "inbound"
      },
      "source": "web",
      "channel": "web",
      "customer": {
        "name": "Anh Trung",
        "phone": "0364757669"
      },
      "direction": "inbound",
      "transport": "livekit_web",
      "session_id": "web-277276e5-5ae3-4083-9767-3fceaef8cd4d",
      "external_ref": "manual-web-test",
      "callee_number": "english-restaurant-reservation",
      "caller_number": "web-user-001",
      "knowledge_bot": {
        "id": 14,
        "code": "english-restaurant-reservation",
        "name": "English Restaurant Reservation"
      },
      "correlation_id": "corr-4dacfae6-6776-4e3b-95cd-913d0895ae90",
      "conversation_id": "conv-78311146-8612-4822-b5ee-7e01e769f622",
      "external_user_id": "test-user-001"
    }
  },
  "session": {
    "accepted": true,
    "session_id": "web-277276e5-5ae3-4083-9767-3fceaef8cd4d",
    "agent_worker_pod": "agent-worker-545fc99bdf-d784l",
    "ready_at": "2026-07-28T15:25:04.692353Z",
    "server_url": "wss://livekit.voxa.vn",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiV2ViIFVzZXIiLCJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6IndlYi0yNzcyNzZlNS01YWUzLTQwODMtOTc2Ny0zZmNlYWVmOGNkNGQiLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlfSwic3ViIjoid2ViLXVzZXItZTQ3MTE5MTRiMTBlIiwiaXNzIjoiY2FsbGJvdF9vNXZ5cm5vMmRoczEiLCJuYmYiOjE3ODUyNTIzMDUsImV4cCI6MTc4NTI3MzkwNX0.w4XrnCf3uEc4U-VqH09LnB_VG6vkwnM2VXAHV9Z4y1k",
    "participant_identity": "web-user-e4711914b10e"
  }
}
```
