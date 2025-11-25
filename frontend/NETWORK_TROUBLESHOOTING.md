# Network Access Troubleshooting

If you can only access ranchOS on localhost but not from other devices on your network, here are solutions:

## Quick Diagnostics

1. **Check if port 8082 is actually listening:**
   ```bash
   # On macOS/Linux:
   lsof -i :8082
   
   # On Windows:
   netstat -an | findstr :8082
   ```

2. **Find your machine's IP address:**
   ```bash
   # On macOS:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # On Linux:
   hostname -I
   
   # On Windows:
   ipconfig
   ```

## Common Issues & Fixes

### Issue 1: Firewall Blocking Port 8082

**macOS Solution:**
```bash
# Allow port 8082 through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

Or use System Preferences:
- System Preferences → Security & Privacy → Firewall → Firewall Options
- Add Node.js and allow incoming connections

**Linux (ufw) Solution:**
```bash
sudo ufw allow 8082/tcp
sudo ufw reload
```

**Linux (firewalld) Solution:**
```bash
sudo firewall-cmd --add-port=8082/tcp --permanent
sudo firewall-cmd --reload
```

**Windows Solution:**
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "ranchOS" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
```

### Issue 2: Docker Not Exposing Port

If using Docker, make sure you're using:

```bash
# Option 1: docker-compose (preferred)
docker-compose up -d

# Option 2: docker run with port mapping
docker run -p 8082:8082 ranchos-demo:latest

# Verify port is exposed:
docker ps
# Should show: 0.0.0.0:8082->8082/tcp
```

### Issue 3: Running in WSL2 (Windows)

WSL2 has network isolation. Solutions:

**Option 1: Port forwarding (Windows PowerShell as Admin):**
```powershell
netsh interface portproxy add v4tov4 listenport=8082 listenaddress=0.0.0.0 connectport=8082 connectaddress=<WSL_IP>
```

**Option 2: Access from Windows:**
```
http://localhost:8082
```

**Option 3: Use WSL2 IP from other devices:**
```bash
# In WSL, get IP:
ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'

# Access from network:
http://<WSL_IP>:8082
```

### Issue 4: VPN or Virtual Network Interfaces

If you have VPN software (VMware, VirtualBox, Parallels), it may create multiple network interfaces.

**Solution:** Find your actual network IP:
```bash
# macOS/Linux - look for 192.168.x.x or 10.x.x.x
ip route get 1.1.1.1 | awk '{print $7}' | head -1
```

## Testing Network Access

**From the same machine:**
```bash
curl http://localhost:8082/api/config
```

**From another device on the network:**
```bash
curl http://<YOUR_MACHINE_IP>:8082/api/config

# Example:
curl http://192.168.1.100:8082/api/config
```

**Using browser on another device:**
```
http://<YOUR_MACHINE_IP>:8082
```

## Still Not Working?

1. **Restart the application:**
   ```bash
   # If using Docker:
   docker-compose restart
   
   # If running directly:
   npm start
   ```

2. **Check server logs:**
   ```bash
   # Should see:
   # "3 Strands Cattle Co. dashboard listening on http://0.0.0.0:8082"
   ```

3. **Verify network connectivity:**
   ```bash
   # From another device, ping your machine:
   ping <YOUR_MACHINE_IP>
   ```

4. **Try a different port:**
   ```bash
   # Change PORT in .env or:
   PORT=3000 npm start
   ```

## Docker-Specific Checks

```bash
# Check container network
docker inspect ranchos-command-center | grep IPAddress

# Check port binding
docker port ranchos-command-center

# Check container logs
docker logs ranchos-command-center

# Access shell in container
docker exec -it ranchos-command-center sh
# Then run: wget http://localhost:8082/api/config
```

## Security Note

When exposing ranchOS to your network:
- Ensure you trust all devices on the network
- Consider using a reverse proxy with SSL for production
- The default login credentials are in the README
