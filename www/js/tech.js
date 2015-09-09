


var TechLoopRxIntervalHandle   = null;
var TechLoopTxIntervalHandle   = null;
var bLookForRsp                = false;
var userPageInc                = 0;
var maxPageRows                = 11;
var currentLabels              = [];            // Create an array
var FreshLoopCounter           = 0;
var LastPageDisplayed          = 0;
var stopSpinnerTimeout         = null;
var bOkToStopSpinner           = false;
var bNeedPageLabel             = false;
var iNumberRows                = 0;
var iTechCount                 = 0;

var ThreeColTable = 
    "<tr> <th id='myH1' colspan='3'></th> </tr>" +
    "<tr> <th>Description</th>  <th>Value</th> <th>Units</th> </tr>" +
    "<tr> <td id='d0'>-</td>  <td id='v0'></td>  <td id='u0'></td></tr>" +
    "<tr> <td id='d1'>-</td>  <td id='v1'></td>  <td id='u1'></td></tr>" +
    "<tr> <td id='d2'>-</td>  <td id='v2'></td>  <td id='u2'></td></tr>" +
    "<tr> <td id='d3'>-</td>  <td id='v3'></td>  <td id='u3'></td></tr>" +
    "<tr> <td id='d4'>-</td>  <td id='v4'></td>  <td id='u4'></td></tr>" +
    "<tr> <td id='d5'>-</td>  <td id='v5'></td>  <td id='u5'></td></tr>" +
    "<tr> <td id='d6'>-</td>  <td id='v6'></td>  <td id='u6'></td></tr>" +
    "<tr> <td id='d7'>-</td>  <td id='v7'></td>  <td id='u7'></td></tr>" +
    "<tr> <td id='d8'>-</td>  <td id='v8'></td>  <td id='u8'></td></tr>" +
    "<tr> <td id='d9'>-</td>  <td id='v9'></td>  <td id='u9'></td></tr>" +
    "<tr> <td id='d10'>-</td> <td id='v10'></td> <td id='u10'></td></tr>" +    
    "<tr> <td id='d11'>-</td> <td id='v11'></td> <td id='u11'></td></tr>";
                            
                            
var FourColTable = 
    "<tr> <th id='myH1' colspan='4'></th> </tr>" +
    "<tr> <th id='a0'>-</th>  <th id='a1'></th>  <th id='a2'></th>  <th id='a3'></th></tr>" +
    "<tr> <td id='b0'>-</td>  <td id='b1'></td>  <td id='b2'></td>  <td id='b3'></td></tr>" +
    "<tr> <td id='c0'>-</td>  <td id='c1'></td>  <td id='c2'></td>  <td id='c3'></td></tr>" +
    "<tr> <td id='d0'>-</td>  <td id='d1'></td>  <td id='d2'></td>  <td id='d3'></td></tr>" +
    "<tr> <td id='e0'>-</td>  <td id='e1'></td>  <td id='e2'></td>  <td id='e3'></td></tr>" +
    "<tr> <td id='f0'>-</td>  <td id='f1'></td>  <td id='f2'></td>  <td id='f3'></td></tr>";

//.............................................................................................
function exitTechMode()
{
    // Exit the engineering mode screen on the CU by simulating a 5 sec button press...
    nxty.SendNxtyMsg(NXTY_GET_MON_MODE_HEADINGS_REQ, null, 0);
}


var tech = {

	// Handle the Tech Mode key
	handleBackKey: function()
	{
	    clearInterval(TechLoopRxIntervalHandle);
	    clearInterval(TechLoopTxIntervalHandle);
	 	PrintLog(1, "Tech: Tech Mode Back key pressed");
	 	
	 	// Send off a message to the CU in 2 seconds.   Did not want to wait for any outstanding message to respond. 
        setTimeout( function(){ exitTechMode(); }, 2000 );
	 	
	 	app.renderHomeView();
	},


    // Handle the Tech Mode key
    clearPage: function()
    {
        var i;
        
        for( i = 0; i < maxPageRows; i++ )
        {
            idTxt = "d" + i;
            document.getElementById(idTxt).innerHTML = "";
            
            idTxt = "v" + i;
            document.getElementById(idTxt).innerHTML = "";
        }        
    },

    // Handle the left arrow key
    handleLeftKey: function()
    {
        SpinnerStart("", "Retrieving previous page...");
        clearTimeout(stopSpinnerTimeout);
        stopSpinnerTimeout = setTimeout(SpinnerStop, 9000); 
        bOkToStopSpinner = false;
        userPageInc = -1;
//        tech.clearPage();
    },


    // Handle the right arrow key
    handleRightKey: function()
    {
        SpinnerStart("", "Retrieving next page...");
        clearTimeout(stopSpinnerTimeout);
        stopSpinnerTimeout = setTimeout(SpinnerStop, 9000);
        bOkToStopSpinner = false;
        userPageInc = 1;
//        tech.clearPage();
    },


	renderTechView: function() 
	{
// NO_U        var myUniiIcon      = (bUniiStatusKnown && bUniiUp) ? szUniiIconButton + szUniiIconUp + "</button>" : szUniiIconButton + szUniiIconDown + "</button>";
        var myBluetoothIcon = isBluetoothCnx ? szBtIconButton + szBtIconOn + "</button>" : szBtIconButton + szBtIconOff + "</button>";
        var myRegIcon       = (nxtyRxRegLockStatus == 0x00) ? szRegIconButton + "</button>" : isRegistered ? szRegIconButton + szRegIconReg + "</button>" : szRegIconButton + szRegIconNotReg + "</button>";
		
		var myHtml = 
			"<img src='img/header_tech.png' width='100%' />" +
			"<button type='button' class='back_icon' onclick='tech.handleBackKey()'><img src='img/go_back.png'/></button>"+
			myRegIcon +
            myBluetoothIcon +
// NO_U            myUniiIcon +

//            "<br><br><br><h1 id=myH1>Heading</h1><br><br>" +
            "<br><br>" +
            "<table id='tech_table' align='center'>" +
            ThreeColTable +
            "</table>" +
            "<button id='left_arrow_id'  type='button' class='myLeftArrow' onclick='tech.handleLeftKey()'><img src='img/arrow_left.png' /></button>" +
            "<button id='right_arrow_id' type='button' class='myRightArrow' onclick='tech.handleRightKey()'><img src='img/arrow_right.png' /></button>";
            
		$('body').html(myHtml);

        document.getElementById("bt_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
        document.getElementById("bt_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
        document.getElementById("reg_icon_id").addEventListener('touchstart', HandleButtonUp );     // up, adds transparency
        document.getElementById("reg_icon_id").addEventListener('touchend',   HandleButtonDown );   // down, back to normal, no transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchstart', HandleButtonUp );      // up, adds transparency
// NO_U        document.getElementById("unii_icon_id").addEventListener('touchend',   HandleButtonDown );    // down, back to normal, no transparency
		
		document.getElementById("left_arrow_id").addEventListener('touchstart', HandleButtonDown );
        document.getElementById("left_arrow_id").addEventListener('touchend',   HandleButtonUp );
        document.getElementById("right_arrow_id").addEventListener('touchstart', HandleButtonDown );
        document.getElementById("right_arrow_id").addEventListener('touchend',   HandleButtonUp );

        		
		
		// Send a message to get the header information...
		// nxty.SendNxtyMsg(NXTY_GET_MON_MODE_HEADINGS_REQ, null, 0);
		
		var u8Buff  = new Uint8Array(10);
        u8Buff[0] = 0;
        u8Buff[1] = 1;  // Grab the description... 
        nxty.SendNxtyMsg(NXTY_GET_MON_MODE_PAGE_REQ, u8Buff, 2); 
                		
		bLookForRsp = true;
		
		// Start the timer to process Rx data
		TechLoopRxIntervalHandle = setInterval(tech.ProcessTechDataLoop, 250 );
		
		// Start the timer to request fresh page data. 
        TechLoopTxIntervalHandle = setInterval(tech.GetFreshPageLoop, 1000 );
        
        currentView = "tech";
	},



    GetFreshPageLoop: function() 
    {
        var u8Buff  = new Uint8Array(10);
        
        if( (bLookForRsp == false) || (FreshLoopCounter > 4) )
        {
            PrintLog(4, "Tech: Get Fresh Page loop..." );
           
            if( (LastPageDisplayed >= 10) && (LastPageDisplayed <= 13) )
            {
                // Cell Detail pages...
                if( document.getElementById('a0').innerHTML.length == 1 )
                {
                    bNeedPageLabel = true;              // Request descriptions if changing pages
                }
                else
                {
                    u8Buff[1] = 0;  // Request values only...
                }
            }
            else
            {
                // Non Cell Detail...
                if( document.getElementById('d0').innerHTML.length == 1 )
                {
                    bNeedPageLabel = true;              // Request descriptions if changing pages
                }
                else
                {
                    u8Buff[1] = 0;  // Request values only...
                }
            } 
           
            if( userPageInc > 0 )
            {
                u8Buff[0] = userPageInc;
                bNeedPageLabel = true;              // Request descriptions if changing pages
            }
            else if( userPageInc < 0 )
            {
                // Set negative page count...
                u8Buff[0] = 0xFF - (userPageInc + 1);   // -1 = 0xFF, -2 = 0xFE
                bNeedPageLabel = true;              // Request descriptions if changing pages
            }
            else
            {
                u8Buff[0] = 0;
            }
            
            userPageInc = 0;
            
            
            if( bNeedPageLabel )
            {
                u8Buff[1] = 1;       // Request labels/descriptions if changing pages
            }
            
            // u8Buff[0] = +/- 15 page increment
            // u8Buff[1] = descriptions or value flag
            nxty.SendNxtyMsg(NXTY_GET_MON_MODE_PAGE_REQ, u8Buff, 2);
            bLookForRsp      = true;
            FreshLoopCounter = 0;
        }
        else
        {
            FreshLoopCounter += 1;
            PrintLog(1, "Tech: Get Fresh Page loop not ready. Cnt: " + FreshLoopCounter );
        }
        
    },




    ProcessTechDataLoop: function() 
    {
    	var i;
    	var j;
    	var idTxt;
        var u8Buff  = new Uint8Array(10);

        if( bLookForRsp )
        {
            if( window.msgRxLastCmd == NXTY_GET_MON_MODE_HEADINGS_RSP )
            {
    			var outText = "Tech: Process Headings Rsp...";
                
                // Grab the JSON string from the Rx buffer...
                // u8RxBuff[0] = len  (should be 255)
                // u8RxBuff[1] = cmd  (should be headings response, 0x45)
                // u8RxBuff[2] to u8RxBuff[253] should be the JSON string data...
                
                // Find the end of the JSON string data...
                for( i = 2; i < 255; i++ )
                {
                	if( u8RxBuff[i] == 0 )
                	{
                		break;
                	}
                }
                var u8Sub  = u8RxBuff.subarray(2, i);		// u8RxBuff[2] to [i-1].
    			
    			var myString   = bluetoothle.bytesToString(u8Sub);
                
                for( var i = 0; i < myString.length; i++ )
                {
                  outText = outText + "  " + myString[i];
                }        

    			PrintLog(1, outText );


                var myHeadings = JSON.parse(myString);
    			            
                // Immediately grab a page of data...
                u8Buff[0] = 0;
                u8Buff[1] = 1;	// Grab the description... 
                nxty.SendNxtyMsg(NXTY_GET_MON_MODE_PAGE_REQ, u8Buff, 2);   
            }
            else if( window.msgRxLastCmd == NXTY_GET_MON_MODE_PAGE_RSP )
            {
    			var outText = "Tech: Process Page Rsp...";
    			var cloudText = "Cloud Text";
                
                // JSON data from device looks like...
                //     { 
                //       �page�:0,
                //       �head�:�This is the heading�,                      // Only with labels
                //       �lbl�: ["5 GHz DL Freq", "5 GHz UL Freq", ...],    // Sent once...
                //       �val�: [5000, 4000, ...],                          // Sent periodically...
                //       "unit":["dBm", "Hz"...]                            // Sent once...
                //     }
                
                // Grab the JSON string from the Rx buffer...
                // u8RxBuff[0] = len  (should be 255)
                // u8RxBuff[1] = cmd  (should be headings response, 0x45)
                // u8RxBuff[2] to u8RxBuff[253] should be the JSON string data...
                
                // Find the end of the JSON string data...
                for( i = 2; i < 255; i++ )
                {
                	if( u8RxBuff[i] == 0 )
                	{
                		break;
                	}
                }
    
                var u8Sub    = u8RxBuff.subarray(2, i);		// u8RxBuff[2] to [i-1].
                var myString = bluetoothle.bytesToString(u8Sub);
    			var myData   = JSON.parse(myString);
    
                PrintLog(1, JSON.stringify(myData) );
    
                // Cell Info:   Pages 1~4
                // Sys Info:    Pages 5~8
                // UNII:        Page  9
                // Cell Detail: Pages 10~13
                // LTE Detail:  Pages 14~17
    
               	outText += " Page: " + myData.page;

                               	
               	if( (myData.page <= 9) || (myData.page >= 14) )
               	{
               	    // Cell Info, Sys Info, UNII and LTE Detail tables...
               	
                    // See if any labels have been included, if so then update...
                    if( myData.lbl.length != 0 )
                    {
                        if( LastPageDisplayed > 9 )
                        {
                            document.getElementById("tech_table").innerHTML = ThreeColTable;
                        }  
                         
                        // See if we have received a new page label. 
                        if( LastPageDisplayed != myData.page )
                        {
                            bOkToStopSpinner  = true;                         
                            LastPageDisplayed = myData.page;
                            bNeedPageLabel    = false;
                        }
                                
                        outText += "  Heading: " + myData.head + " Label: ";
                    
                        // Send the heading to the cloud...
                        cloudText = "'P" + myData.page + "_head':'" + myData.head + "'";
                        SendCloudData(cloudText); 
                        
                        // Update the heading........
                        document.getElementById("myH1").innerHTML = myData.head;
                           
                        for( i = 0; i < myData.lbl.length; i++ )
                        {
                        	idTxt = "d" + i;
                            document.getElementById(idTxt).innerHTML = myData.lbl[i];
                        	outText += " " + myData.lbl[i];
                        	
                        	// Store the labels to send to the cloud as "P1_label"...
                        	currentLabels[i] = "P" + myData.page + "_" + myData.lbl[i];
                        }
    
                        iNumberRows = myData.lbl.length;
                        
                    }        
                           
                    // See if any values have been included, 
                    // if so then update only if the bNeedPageLabel has been cleared, meaning we have labels.   
                    if( (myData.val.length != 0) && (bNeedPageLabel == false) )
                    {
                        outText += " Val: ";    
                        for( i = 0; i < myData.val.length; i++ )
                        {
                        	idTxt = "v" + i;
                            document.getElementById(idTxt).innerHTML = myData.val[i];
                        	outText = outText + " " + myData.val[i];
                        	
                        	if( i == 0 )
                        	{
                        	   // Let the cloud know what page this data is for...
                        	   cloudText = "'currentPage':" + myData.page;
                        	}
                        	
                        	cloudText += ", '" + currentLabels[i] + "':" + myData.val[i];
                        }
                        
                        SendCloudData(cloudText);   // The cloud does not get units or should I append to label?
                        if( bOkToStopSpinner)
                        {
                            SpinnerStop();
                            clearTimeout(stopSpinnerTimeout);
                        }
                        
                    }
        
        
                           
                    // See if any units have been included, if so then update...
                    if( (myData.unit.length != 0) && (bNeedPageLabel == false) )
                    {
                        outText += " Unit: ";
                        for( i = 0; i < myData.unit.length; i++ )
                        {
                            idTxt = "u" + i;
                            document.getElementById(idTxt).innerHTML = myData.unit[i];
                            outText += " " + myData.unit[i];
                        }
                        
                        // Clear the remaining rows...
                        for( i = iNumberRows; i < 12; i++ )
                        {
                            idTxt = "d" + i;
                            document.getElementById(idTxt).innerHTML = "-";
                            idTxt = "v" + i;
                            document.getElementById(idTxt).innerHTML = "-";
                            idTxt = "u" + i;
                            document.getElementById(idTxt).innerHTML = "-";
                        }
                        
                        
                         
                    }
                }
                else if( (myData.page >= 10) && (myData.page <= 13) )
                {
                    // Cell Detail
                    //  ID   DLFreqMHz  RSCP  ECIO        (WCDMA)
                    //  ID   DLFreqMHz  RSRP  RSRQ        (LTE)
                    //  92    739.0     -93     -8
                
                    // See if any labels have been included, if so then update...
                    if( myData.lbl.length != 0 )
                    {
                        if( (LastPageDisplayed < 10) || (LastPageDisplayed > 13) )
                        {
                            document.getElementById("tech_table").innerHTML = FourColTable;
                        }  

                        // See if we have received a new page label. 
                        if( LastPageDisplayed != myData.page )
                        {
                            bOkToStopSpinner  = true;                         
                            LastPageDisplayed = myData.page;
                            bNeedPageLabel    = false;
                        }

                         
                        outText += "  Heading: " + myData.head + " Label: ";
                    
                        // Send the heading to the cloud...
                        cloudText = "'P" + myData.page + "_head':'" + myData.head + "'";
                        SendCloudData(cloudText); 
                        
                        // Update the heading........
                        document.getElementById("myH1").innerHTML = myData.head;
                           
                        for( i = 0; i < myData.lbl.length; i++ )
                        {
                            idTxt = "a" + i;
                            document.getElementById(idTxt).innerHTML = myData.lbl[i];
                            outText += " " + myData.lbl[i];
                            
                            // Store the labels to send to the cloud as "P1_label"...
                            currentLabels[i] = "P" + myData.page + "_" + myData.lbl[i];
                        }

                        
                        // Clear the data...At most 5 rows with 4 columns for 20 data items total...    
                        for( i = 0; i < 20; i += 4 )
                        {   
                            // Write a single row, 4 columns...
                            for( j = 0; j < 4; j++ )
                            {
                                switch( i )
                                {
                                    case 0:  idTxt = "b" + j;    break; 
                                    case 4:  idTxt = "c" + j;    break; 
                                    case 8:  idTxt = "d" + j;    break; 
                                    case 12: idTxt = "e" + j;    break; 
                                    case 16: idTxt = "f" + j;    break; 
                                }
                                
                                document.getElementById(idTxt).innerHTML = "-";
                            }
                        }
                                                
                    }        
                         
                    // See if any values have been included, 
                    // if so then update only if the bNeedPageLabel has been cleared, meaning we have labels.   
                    if( (myData.val.length != 0) && (bNeedPageLabel == false) )                    
                    {
                        outText += " Val: ";

                        // Let the cloud know what page this data is for...
                        cloudText = "'currentPage':" + myData.page;
                        
                        // At most 5 rows with 4 columns for 20 data items total...    
                        for( i = 0; i < 20; i += 4 )
                        {   
                            // Write a single row, 4 columns...
                            for( j = 0; j < 4; j++ )
                            {
                                switch( i )
                                {
                                    case 0:  idTxt = "b" + j;    break; 
                                    case 4:  idTxt = "c" + j;    break; 
                                    case 8:  idTxt = "d" + j;    break; 
                                    case 12: idTxt = "e" + j;    break; 
                                    case 16: idTxt = "f" + j;    break; 
                                }
                                
                                if( i < myData.val.length )
                                {
                                    document.getElementById(idTxt).innerHTML = myData.val[i+j];
                                    outText = outText + " " + myData.val[i+j];
                                    
                                    // Labels should look like "P13_ID_92" or "P13_DLFreqMHz_92"...where 92 is the ID value
                                    cloudText += ", '" + currentLabels[j] + "_" + myData.val[i] + "':" + myData.val[i+j];
                                }
                                else
                                {
                                    // Clear the remaining rows...
                                    document.getElementById(idTxt).innerHTML = "-";
                                }
                            }
                        }

                        SendCloudData(cloudText);   // The cloud does not get units or should I append to label?
                        if( bOkToStopSpinner )
                        {
                            SpinnerStop();
                            clearTimeout(stopSpinnerTimeout);
                            
                        }
                    }
        
        
                           
                    // See if any units have been included, if so then update...
                    if( (myData.unit.length != 0) && (bNeedPageLabel == false) )
                    {
                        outText += " Unit: ";
                        for( i = 0; i < myData.unit.length; i++ )
                        {
                            idTxt = "u" + i;
                            document.getElementById(idTxt).innerHTML = myData.unit[i];
                            outText += " " + myData.unit[i];
                        } 
                    }
                }
                
                
                                
    			PrintLog(1, outText );

/*
// NO_U
                // Every 5 cycles, approx every 5 seconds, get UNII status....    			
                iTechCount++;
                if( iTechCount >= 5 )
                {
                    // Check UNII status....
                    PrintLog(1, "Tech: Check UNII status..." );
                    iTechCount = 0;
     
                    // Check to see if UNII is up...
                    nxtyCurrentReq  = NXTY_SEL_PARAM_LINK_STATE;
                    u8Buff[0] = 0x02;                       // Check CU   
                    u8Buff[1] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 1: LinkState
                    u8Buff[2] = NXTY_SEL_PARAM_LINK_STATE;  // SelParamReg 2: LinkState
                    nxty.SendNxtyMsg(NXTY_SYS_INFO_REQ, u8Buff, 3); 
                }
                else
*/                
                {
                    // Normal processing to acknowledge receipt of response...
                    bLookForRsp = false;
                }
              
            }  // End if( window.msgRxLastCmd == NXTY_GET_MON_MODE_PAGE_RSP )
            else if( window.msgRxLastCmd == NXTY_SYS_INFO_RSP )
            {
                bLookForRsp = false;
            }
            
        }   // End if( bLookForRsp )   
        
        
    },



};






	
