'use client'

export default function Info() {
    return(
        <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
            <h2 className='text-xl font-bold border-b border-gray-300 py-2'>Selayang Pandang</h2>

            {/* Key Metrics Section */}
            <section className="grid grid-cols-1 mb-8">
                {/* Metric Card 1: Total Users */}
                <div className="border-l-4 border-info bg-white text-sm text-base-content p-6 shadow-md">
                    <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce pharetra blandit arcu, nec vestibulum sem luctus sed. Phasellus a finibus diam. Etiam eget urna et lacus suscipit elementum. Ut eu ipsum finibus, consequat diam sed, malesuada turpis. Fusce pretium tortor non odio tempor varius. Donec dui magna, tincidunt eget mauris vitae, vulputate auctor tortor. Fusce euismod ante purus, et semper ex sodales ut. Nunc at nibh neque.
                        Cras iaculis, turpis ac lacinia tempus, tortor ante pulvinar dolor, a posuere nisi magna id risus. Aliquam vestibulum sapien sit amet libero malesuada, at lacinia quam finibus. Curabitur vestibulum bibendum sagittis. Fusce quis pharetra eros, eget dictum erat. Nullam lacinia nisi eget justo convallis feugiat vitae eu arcu. Nullam non lacus a nisl tempus accumsan. Sed ligula justo, pretium vitae tincidunt vel, fermentum eget erat. Nullam non ornare ligula. Aenean bibendum libero non vestibulum bibendum. In condimentum, felis et fermentum dictum, metus massa blandit orci, eu ornare nisl felis id justo. Cras commodo vestibulum dui, at pharetra risus iaculis eu. Fusce a ultricies enim. Aliquam condimentum, orci at hendrerit vulputate, massa odio auctor ligula, vitae interdum est purus vel sem. Curabitur congue est eget tempor pellentesque. Nulla facilisi. Sed eu purus tellus.
                    </p>
                </div>
            </section>
            
            <h2 className='text-xl font-bold border-b border-gray-300 py-2'>Tim Pengembang</h2>
        </main>
    )
}