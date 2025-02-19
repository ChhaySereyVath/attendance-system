import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.page.html',
  styleUrls: ['./attendance.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class AttendancePage implements OnInit {
  lastName: string = '';
  firstName: string = '';
  currentTime: string = '';
  checkInTime: string | null = null;
  checkOutTime: string | null = null;
  totalWorkTime: string | null = null;
  isCheckInDisabled: boolean = true; 
  isCheckOutDisabled: boolean = true;
  locationStatus: string = 'Checking your location...';

  // Ministry of Planning Location
  allowedLocation = { latitude: 11.547639, longitude: 104.923083 };
  allowedRadius = 300; 

  constructor(private alertController: AlertController) {}

  ngOnInit() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.loadStoredData();
    this.getUserLocation(); 
  }

  updateClock() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { hour12: false });
  }

  async getUserLocation() {
    if (!navigator.geolocation) {
      this.locationStatus = '⚠️ Geolocation is not supported by your browser.';
      return;
    }
  
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy; 
        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
  
        let dynamicRadius = this.allowedRadius; 
  
        // ✅ Adjust allowed radius if accuracy is poor
        if (accuracy > 100) {
          dynamicRadius = 200; 
        }
  
        const distance = this.calculateDistance(userLocation);
  
        if (distance <= dynamicRadius) { 
          this.locationStatus = `✅ Location Verified: ${distance.toFixed(2)}m from center (Accuracy: ${accuracy.toFixed(2)}m).`;
          this.isCheckInDisabled = false;
          this.isCheckOutDisabled = false;
        } else {
          this.locationStatus = `⚠️ You are ${distance.toFixed(2)}m away! (GPS Accuracy: ${accuracy.toFixed(2)}m).`;
          this.isCheckInDisabled = true;
          this.isCheckOutDisabled = true;
  
          if (accuracy > 100) {
            this.locationStatus += ' Try moving near a window for better accuracy.';
          }
        }
      },
      (error) => {
        this.locationStatus = '❌ Location access denied. Enable location to check in.';
        this.isCheckInDisabled = true;
        this.isCheckOutDisabled = true;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  calculateDistance(userLocation: { latitude: number; longitude: number }): number {
    const earthRadius = 6371000; 

    const dLat = this.toRadians(userLocation.latitude - this.allowedLocation.latitude);
    const dLon = this.toRadians(userLocation.longitude - this.allowedLocation.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.allowedLocation.latitude)) * Math.cos(this.toRadians(userLocation.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  loadStoredData() {
    this.checkInTime = localStorage.getItem('checkInTime');
    this.checkOutTime = localStorage.getItem('checkOutTime');

    this.isCheckInDisabled = this.checkInTime !== null && this.checkOutTime === null;
    this.isCheckOutDisabled = this.checkInTime === null || this.checkOutTime !== null;
  }

  async onCheckIn() {
    if (this.isCheckInDisabled) return;

    if (!this.lastName || !this.firstName) {
        this.showAlert('⚠️ Incomplete Information', 'Please enter both Last Name and First Name.');
        return;
    }

    const checkInTime = new Date().toISOString();
    console.log("📤 Sending Check-In Data:", { firstName: this.firstName, lastName: this.lastName, checkInTime });

    const checkInData = {
        firstName: this.firstName,
        lastName: this.lastName,
        checkInTime: checkInTime,
    };

    try {
      const response = await fetch(`${environment.apiUrl}/attendance/check-in`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkInData),
      });
  
      const data = await response.json(); 
  
      if (!response.ok) {
          throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
  
      console.log("✅ Check-In Successful:", data);
  
      this.checkInTime = checkInTime;
      localStorage.setItem('checkInTime', this.checkInTime);
  
      this.isCheckInDisabled = true;
      this.isCheckOutDisabled = false;
  
      this.showAlert('✅ Success', `Checked in at ${new Date(this.checkInTime).toLocaleString()}`);
  
    } catch (error) {
      console.error('❌ Check-In Error:', error);
      this.showAlert('❌ Check-In Failed', 'Please try again later.');
    }
  
  }

  async onCheckOut() {
    if (!this.lastName || !this.firstName) {
        this.showAlert('⚠️ Warning', 'Please enter both Last Name and First Name.');
        return;
    }

    const checkOutData = {
        firstName: this.firstName,
        lastName: this.lastName,
        checkOutTime: new Date().toISOString(), 
    };

    try {
        console.log('📤 Sending Check-Out Data:', checkOutData);

        const response: any = await fetch(`${environment.apiUrl}/attendance/check-out`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkOutData),
        }).then(res => res.json());

        if (response.error) {
            throw new Error(response.error);
        }

        this.checkOutTime = response.checkOutTime || '';  
        this.totalWorkTime = response.totalHours || 'Not available';  

        localStorage.setItem('checkOutTime', this.checkOutTime ?? '');
        localStorage.setItem('totalWorkTime', this.totalWorkTime ?? '');

        this.showAlert('✅ Success', `Checked out at ${this.checkOutTime}. Total Work: ${this.totalWorkTime}`);
        
        this.lastName = '';
        this.firstName = '';
        this.isCheckInDisabled = false;
    } catch (error) {
        console.error('❌ Check-Out Error:', error);
        this.showAlert('❌ Check-Out Failed', 'Please try again later.');
    }
  }


  getFormattedTime(time: string | null, defaultText: string): string {
    return time ? new Date(time).toLocaleString() : defaultText;
  }
  

  refreshLocation() {
    this.locationStatus = "📡 Refreshing location...";
    this.getUserLocation(); 
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}