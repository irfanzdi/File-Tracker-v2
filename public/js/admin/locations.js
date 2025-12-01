const el = id => document.getElementById(id);

    let locationData = [];
    let folderData = [];
    let currentRack = null;
    let currentLocationId = null;
    let editId = null;
    let folderToDelete = null;

    // Toast Notification
    function showToast(message, type="success") {
      const container = el("toastContainer");
      const toast = document.createElement("div");
      toast.className = `toast flex items-center gap-2 bg-white border rounded-lg shadow-lg px-4 py-3 transition-all ${type==="success"?"border-green-500":"border-red-500"}`;
      toast.innerHTML = `<span class="text-lg">${type==="success"?"✅":"❌"}</span><p class="text-gray-700 font-medium">${message}</p>`;
      container.appendChild(toast);
      setTimeout(()=>{ toast.style.opacity="0"; toast.style.transform="translateY(-10px)"; setTimeout(()=>toast.remove(),300);},3000);
    }

    document.addEventListener("DOMContentLoaded",()=>{
      loadLocations();
      loadFolders();
      setupEventListeners();
    });

    function setupEventListeners(){
      el("addLocationForm")?.addEventListener("submit", addLocation);
      el("editLocationForm")?.addEventListener("submit", saveLocationChanges);
      el("searchBtn")?.addEventListener("click", searchFolders);
      el("searchInput")?.addEventListener("keypress",(e)=>{ if(e.key==="Enter") searchFolders(); });
      el("clearSearchBtn")?.addEventListener("click", clearSearch);
      el("cancelDeleteBtn")?.addEventListener("click", closeDeleteModal);
      el("confirmDeleteBtn")?.addEventListener("click", confirmDelete);
      el("editModal")?.addEventListener("click",(e)=>{if(e.target.id==="editModal") closeEditModal();});
      el("viewModal")?.addEventListener("click",(e)=>{if(e.target.id==="viewModal") closeViewModal();});
      el("deleteModal")?.addEventListener("click",(e)=>{if(e.target.id==="deleteModal") closeDeleteModal();});
    }

    async function loadLocations(){
      try{
        const res = await fetch("/api/locations");
        locationData = res.ok?await res.json():[];
      }catch{ locationData=[]; }
      renderLocationsTable(locationData);
      populateLocationSelect();
    }

    async function loadFolders(){
      try{
        const res = await fetch("/api/folder");
        folderData = res.ok?await res.json():[];
      }catch{ folderData=[]; }
    }

    function populateLocationSelect(){
      const select = el("selectLocation");
      select.innerHTML='<option value="">Choose a location...</option>';
      locationData.forEach(loc=>{const opt=document.createElement("option"); opt.value=loc.location_id; opt.textContent=loc.location_name; select.appendChild(opt);});
    }

    function onLocationChange(){
      const locationId = el("selectLocation")?.value;
      if(!locationId){ el("rackSection").classList.add("hidden"); return;}
      currentLocationId=locationId;
      loadRacksForLocation(locationId);
    }

    function loadRacksForLocation(locationId){
      const foldersInLocation = folderData.filter(f=>f.location_id==locationId && f.rack_name);
      const uniqueRacks=[...new Set(foldersInLocation.map(f=>f.rack_name))].filter(Boolean);
      const select=el("selectRack");
      select.innerHTML='<option value="">Choose a rack...</option>';
      uniqueRacks.forEach(rack=>{ const opt=document.createElement("option"); opt.value=rack; opt.textContent=rack; select.appendChild(opt);});
      el("rackSection").classList.remove("hidden");
      el("rackView").classList.add("hidden");
    }

    function loadRackView(){
      const rackName=el("selectRack")?.value;
      if(!rackName){el("rackView").classList.add("hidden"); return;}
      currentRack=rackName;
      const foldersInRack = folderData.filter(f=>f.location_id==currentLocationId && f.rack_name===rackName && f.rack_column && f.rack_row);
      if(foldersInRack.length===0){el("rackView").classList.add("hidden"); showToast("No folders in this rack","error"); return;}
      const maxCol=Math.max(...foldersInRack.map(f=>f.rack_column));
      const maxRow=Math.max(...foldersInRack.map(f=>f.rack_row));
      el("currentRackName").textContent=rackName;
      el("rackView").classList.remove("hidden");
      renderRackGrid(maxCol,maxRow,foldersInRack);
    }

    function renderRackGrid(columns,rows,folders){
      const grid=el("rackGrid"); grid.innerHTML="";
      const table=document.createElement("table"); table.className="border-collapse";
      const headerRow=document.createElement("tr"); headerRow.innerHTML='<th class="bg-gray-200 border border-gray-400 px-3 py-2 text-xs font-bold"></th>';
      for(let c=1;c<=columns;c++) headerRow.innerHTML+=`<th class="bg-gray-200 border border-gray-400 px-3 py-2 text-xs font-bold">C${c}</th>`;
      table.appendChild(headerRow);
      for(let r=1;r<=rows;r++){
        const row=document.createElement("tr");
        row.innerHTML=`<th class="bg-gray-200 border border-gray-400 px-3 py-2 text-xs font-bold">R${r}</th>`;
        for(let c=1;c<=columns;c++){
          const folder=folders.find(f=>f.rack_column==c && f.rack_row==r);
          let cellClass="border border-gray-400 w-24 h-24 cursor-pointer hover:bg-gray-100 transition p-2";
          let cellContent='<div class="text-xs text-gray-400 text-center">Empty</div>';
          if(folder){ cellClass="border-2 border-yellow-400 bg-yellow-100 w-24 h-24 cursor-pointer hover:bg-yellow-200 transition p-2"; cellContent=`<div class="text-xs font-semibold text-yellow-900 overflow-hidden"><div class="text-center mb-1">📁</div><div class="truncate" title="${folder.folder_name}">${folder.folder_name}</div></div>`; }
          const cellId=folder?folder.folder_id:null;
          row.innerHTML+=`<td class="${cellClass}" onclick="openCellDetails(${c},${r},${cellId})">${cellContent}</td>`;
        }
        table.appendChild(row);
      }
      grid.appendChild(table);
    }

    function openCellDetails(col,row,folderId){
      el("cellLocation").textContent=`${currentRack} - Column ${col}, Row ${row}`;
      const detailsDiv=el("assignmentDetails");
      if(folderId){
        const folder=folderData.find(f=>f.folder_id===folderId);
        const locationName=locationData.find(l=>l.location_id==folder.location_id)?.location_name||'Unknown';
        const filesCount=folder.files_inside?.length||0;
        detailsDiv.innerHTML=`<div class="space-y-3">
          <div><p class="text-xs text-gray-500 mb-1 font-semibold">Type</p><p class="text-sm font-semibold text-gray-800">📁 Folder</p></div>
          <div><p class="text-xs text-gray-500 mb-1 font-semibold">Folder Name</p><p class="text-base font-bold text-gray-900">${folder.folder_name}</p></div>
          <div><p class="text-xs text-gray-500 mb-1 font-semibold">Serial Number</p><p class="text-sm font-mono text-blue-600">${folder.serial_num||'-'}</p></div>
          <div class="grid grid-cols-2 gap-3"><div><p class="text-xs text-gray-500 mb-1 font-semibold">Department</p><p class="text-sm text-gray-800">${folder.department||'-'}</p></div>
          <div><p class="text-xs text-gray-500 mb-1 font-semibold">Files Inside</p><p class="text-sm text-gray-800">${filesCount} files</p></div></div>
          <div><p class="text-xs text-gray-500 mb-1 font-semibold">Location</p><p class="text-sm text-gray-800">${locationName}</p></div>
          <div><p class="text-xs text-gray-500 mb-1 font-semibold">Position</p><p class="text-sm text-gray-800">Col ${col} | Row ${row}</p></div>
        </div>`;
      } else detailsDiv.innerHTML='<p class="text-gray-500 text-sm">Empty Cell</p>';
      el("viewModal").classList.remove("hidden"); el("viewModal").classList.add("modal-show");
    }

    function closeViewModal(){ el("viewModal").classList.add("hidden"); el("viewModal").classList.remove("modal-show"); }
    function openEditModal(loc){ editId=loc.location_id; el("editLoct").value=loc.location_name; el("editModal").classList.remove("hidden"); el("editModal").classList.add("modal-show"); }
    function closeEditModal(){ el("editModal").classList.add("hidden"); el("editModal").classList.remove("modal-show"); editId=null; }

    async function addLocation(e){
      e.preventDefault();
      const name=el("loct_name").value.trim();
      if(!name) return showToast("Location name required","error");
      const newLoc={location_name:name,location_id:Date.now()};
      locationData.push(newLoc);
      renderLocationsTable(locationData);
      populateLocationSelect();
      el("loct_name").value="";
      showToast("Location added successfully");
    }

    function renderLocationsTable(data){
      const tbody=el("locationsTable").querySelector("tbody");
      tbody.innerHTML="";
      if(data.length===0){ el("noLocations").classList.remove("hidden"); return;}
      el("noLocations").classList.add("hidden");
      data.forEach((loc,i)=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td class="text-center px-3 py-2">${i+1}</td>
          <td class="text-center px-3 py-2">${loc.location_name}</td>
          <td class="text-center px-3 py-2">
            <button class="btn-secondary text-sm mr-2" onclick='openEditModal(${JSON.stringify(loc)})'>Edit</button>
            <button class="btn-danger text-sm" onclick='openDeleteModal(${JSON.stringify(loc)})'>Delete</button>
          </td>`;
        tbody.appendChild(tr);
      });
    }

    function saveLocationChanges(e){
      e.preventDefault();
      const newName=el("editLoct").value.trim();
      if(!newName) return showToast("Location name required","error");
      const loc=locationData.find(l=>l.location_id==editId);
      if(loc){ loc.location_name=newName; renderLocationsTable(locationData); populateLocationSelect(); showToast("Location updated"); }
      closeEditModal();
    }

    function openDeleteModal(loc){ folderToDelete=loc; el("deleteFolderName").textContent=loc.location_name; el("deleteModal").classList.remove("hidden"); el("deleteModal").classList.add("modal-show"); }
    function closeDeleteModal(){ el("deleteModal").classList.add("hidden"); el("deleteModal").classList.remove("modal-show"); folderToDelete=null; }
    function confirmDelete(){ if(folderToDelete){ locationData=locationData.filter(l=>l.location_id!==folderToDelete.location_id); renderLocationsTable(locationData); populateLocationSelect(); showToast("Location deleted","success"); closeDeleteModal(); } }

    function searchFolders(){
      const query=el("searchInput").value.toLowerCase();
      if(!query){ el("searchResults").classList.add("hidden"); return; }
      const results=folderData.filter(f=>f.folder_name.toLowerCase().includes(query)|| (f.serial_num||'').toLowerCase().includes(query)|| (f.rack_name||'').toLowerCase().includes(query)|| (f.department||'').toLowerCase().includes(query));
      const body=el("searchResultsBody"); body.innerHTML="";
      if(results.length===0){ body.innerHTML='<p class="text-gray-500">No folders found.</p>'; } else {
        results.forEach(f=>{
          const div=document.createElement("div");
          div.className="border p-3 rounded shadow hover:shadow-md cursor-pointer";
          div.innerHTML=`<p class="font-semibold">${f.folder_name}</p><p class="text-xs text-gray-500">${f.serial_num||'-'} | ${f.rack_name||'-'} | ${f.department||'-'}</p>`;
          body.appendChild(div);
        });
      }
      el("searchResults").classList.remove("hidden");
    }

    function clearSearch(){ el("searchInput").value=""; el("searchResults").classList.add("hidden"); }

     el("logoutBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch(e){ /* ignore */ }
    localStorage.clear();
    window.location.href = "/login.html";
  });