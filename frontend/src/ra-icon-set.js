import '@polymer/iron-iconset-svg/iron-iconset-svg.js';

const documentContainer = document.createElement('template');
documentContainer.setAttribute('style', 'display: none;');

documentContainer.innerHTML = `<iron-iconset-svg name="ic" size="24">
  <svg><defs>
    
  </defs></svg>
</iron-iconset-svg>`;

document.head.appendChild(documentContainer.content);
